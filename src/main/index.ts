import { app, BrowserWindow, globalShortcut, ipcMain, clipboard, nativeTheme } from 'electron'
import { join } from 'path'
import { createTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcut'
import Store from 'electron-store'

const store = new Store({
  defaults: {
    // Legacy keys (kept for migration)
    apiKey: '',
    apiHost: 'https://api.openai.com/v1',
    // Multi-provider system
    providers: [] as Array<{ id: string; name: string; apiHost: string; apiKey: string }>,
    model: 'gpt-4o-mini',
    modelList: [] as Array<{ id: string; providerId: string }>,
    translateModel: '',
    shortcut: 'Alt+Space',
    targetLanguage: 'zh-CN',
    theme: 'system',
    themeColor: 'indigo',
    windowWidth: 520,
    windowHeight: 440
  }
})

/**
 * Migrate legacy single-provider config to multi-provider format.
 * Runs once on first launch after update — preserves existing apiHost/apiKey/models.
 */
function migrateToMultiProvider(): void {
  const providers = store.get('providers') as Array<{ id: string; name: string; apiHost: string; apiKey: string }>
  const modelList = store.get('modelList') as unknown

  // Already migrated if providers array is non-empty
  if (providers && providers.length > 0) return

  const legacyHost = (store.get('apiHost') as string) || 'https://api.openai.com/v1'
  const legacyKey = (store.get('apiKey') as string) || ''

  // Create the first provider from legacy data
  const defaultProvider = {
    id: 'provider_default',
    name: '默认供应商',
    apiHost: legacyHost,
    apiKey: legacyKey
  }

  store.set('providers', [defaultProvider])

  // Migrate modelList from string[] to ModelItem[]
  if (Array.isArray(modelList)) {
    const isLegacy = modelList.length === 0 || typeof modelList[0] === 'string'
    if (isLegacy) {
      const legacyModels = modelList as string[]
      const migratedModels = (legacyModels.length > 0 ? legacyModels : ['gpt-4o-mini']).map(m => ({
        id: m,
        providerId: defaultProvider.id
      }))
      store.set('modelList', migratedModels)
    }
  } else {
    // No model list at all — create default
    store.set('modelList', [{ id: 'gpt-4o-mini', providerId: defaultProvider.id }])
  }
}

type ThemeMode = 'system' | 'light' | 'dark'
type ThemeColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'ocean'

const WINDOW_BACKGROUND_COLORS: Record<'light' | 'dark', Record<ThemeColor, string>> = {
  light: {
    indigo: '#eef1ff',
    emerald: '#edf9f4',
    amber: '#fff6e8',
    rose: '#fff0f4',
    ocean: '#eef7ff'
  },
  dark: {
    indigo: '#171c30',
    emerald: '#10211f',
    amber: '#271d12',
    rose: '#261620',
    ocean: '#102131'
  }
}

let miniWindow: BrowserWindow | null = null

function getEffectiveThemeMode(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  }

  return theme
}

function getMiniWindowBackgroundColor(): string {
  const theme = getEffectiveThemeMode((store.get('theme') as ThemeMode) || 'system')
  const themeColor = (store.get('themeColor') as ThemeColor) || 'indigo'

  return WINDOW_BACKGROUND_COLORS[theme][themeColor] || WINDOW_BACKGROUND_COLORS[theme].indigo
}

function syncMiniWindowBackground(): void {
  if (!miniWindow || miniWindow.isDestroyed()) {
    return
  }

  miniWindow.setBackgroundColor(getMiniWindowBackgroundColor())
}

function createMiniWindow(): void {
  const width = store.get('windowWidth') as number || 520
  const height = store.get('windowHeight') as number || 440

  miniWindow = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: getMiniWindowBackgroundColor(),
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  miniWindow.on('blur', () => {
    // Don't hide if user is interacting with settings or pinned
    miniWindow?.webContents.send('window-blur')
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })

  miniWindow.on('resize', () => {
    if (miniWindow) {
      const [w, h] = miniWindow.getSize()
      store.set('windowWidth', w)
      store.set('windowHeight', h)
    }
  })

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    miniWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    miniWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showMiniWindow(): void {
  if (!miniWindow || miniWindow.isDestroyed()) {
    createMiniWindow()
  }

  // Read clipboard before showing
  const clipboardText = clipboard.readText().trim()

  // Center window on the current cursor screen
  const { screen } = require('electron')
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = display.workArea
  const [winWidth, winHeight] = miniWindow!.getSize()

  miniWindow!.setPosition(
    Math.round(x + (width - winWidth) / 2),
    Math.round(y + (height - winHeight) / 3) // slightly above center
  )

  miniWindow!.show()
  miniWindow!.focus()
  miniWindow!.setAlwaysOnTop(true, 'screen-saver')

  // Send clipboard content to renderer
  miniWindow!.webContents.send('window-show', clipboardText)
}

function toggleMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed() && miniWindow.isVisible()) {
    hideMiniWindow()
  } else {
    showMiniWindow()
  }
}

function hideMiniWindow(): void {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.hide()
  }
}

// IPC Handlers
function setupIPC(): void {
  ipcMain.handle('get-config', (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('set-config', (_event, key: string, value: unknown) => {
    store.set(key, value)
    // Re-register shortcut if changed
    if (key === 'shortcut') {
      unregisterShortcuts()
      registerShortcuts(store.get('shortcut') as string, toggleMiniWindow)
    }
    // Update theme if changed
    if (key === 'theme') {
      nativeTheme.themeSource = value as 'system' | 'dark' | 'light'
    }

    if (key === 'theme' || key === 'themeColor') {
      syncMiniWindowBackground()
    }
  })

  ipcMain.handle('hide-window', () => {
    hideMiniWindow()
  })

  ipcMain.handle('get-clipboard', () => {
    return clipboard.readText().trim()
  })

  ipcMain.handle('get-all-config', () => {
    return store.store
  })
}

// Disable window animations for transparent windows on Windows
app.commandLine.appendSwitch('wm-window-animations-disabled')

// App lifecycle
app.whenReady().then(() => {
  // Migrate legacy single-provider data to multi-provider format
  migrateToMultiProvider()

  // Set theme
  const theme = store.get('theme') as string
  if (theme && theme !== 'system') {
    nativeTheme.themeSource = theme as 'dark' | 'light'
  }

  setupIPC()
  createMiniWindow()
  createTray(showMiniWindow, app)
  registerShortcuts(store.get('shortcut') as string, toggleMiniWindow)

  nativeTheme.on('updated', () => {
    if ((store.get('theme') as ThemeMode) === 'system') {
      syncMiniWindowBackground()
    }
  })

  // Start selection service
  import('./selection').then(({ startSelectionService, setActionCallback, configure }) => {
    configure({
      preloadPath: join(__dirname, '../preload/index.js'),
      rendererPath: join(__dirname, '../renderer/selectionToolbar.html')
    })
    startSelectionService()
    setActionCallback((action, text) => {
      // Show main window first
      showMiniWindow()
      // Wait for the window to be fully visible and renderer ready
      if (miniWindow && !miniWindow.isDestroyed()) {
        // Use a delay to ensure React has mounted and event listeners are active
        setTimeout(() => {
          if (miniWindow && !miniWindow.isDestroyed()) {
            miniWindow.webContents.send('selection-action-trigger', action, text)
          }
        }, 150)
      }
    })
  }).catch(e => console.error('Failed to load selection service:', e))
})

app.on('will-quit', () => {
  unregisterShortcuts()
  import('./selection').then(({ stopSelectionService }) => {
    stopSelectionService()
  }).catch(e => console.error('Failed to stop selection service:', e))
})

app.on('window-all-closed', () => {
  // Keep app running in tray
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showMiniWindow()
  })
}
