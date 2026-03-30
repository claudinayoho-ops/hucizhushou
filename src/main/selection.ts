import { BrowserWindow, clipboard, ipcMain, screen, shell } from 'electron'

let SelectionHook: any = null
try {
  SelectionHook = require('selection-hook')
} catch (error) {
  console.error('Failed to load selection-hook:', error)
}

type Point = { x: number; y: number }

const TOOLBAR_WIDTH = 220
const TOOLBAR_HEIGHT = 46
const BUTTON_ACTIONS = ['translate', 'explain', 'search', 'copy'] as const

let toolbarWindow: BrowserWindow | null = null
let selectionHook: any = null
let started = false
let selectedText = ''
let lastHideTime = 0
let lastHideReason: 'mouse-down' | 'dismiss' = 'dismiss'
let isListeningForHide = false

// Paths must be injected from the main entry (index.ts) because this module
// is compiled as a Rollup chunk in out/main/chunks/, making __dirname unreliable.
let configuredPreloadPath = ''
let configuredRendererPath = ''

export function configure(opts: {
  preloadPath: string
  rendererPath: string
}): void {
  configuredPreloadPath = opts.preloadPath
  configuredRendererPath = opts.rendererPath
}

function isToolbarAlive(): boolean {
  return toolbarWindow !== null && !toolbarWindow.isDestroyed()
}

function createToolbarWindow(): void {
  if (isToolbarAlive()) return
  if (!configuredPreloadPath) {
    console.error('[Selection] preloadPath not configured! Call configure() first.')
    return
  }

  toolbarWindow = new BrowserWindow({
    width: TOOLBAR_WIDTH,
    height: TOOLBAR_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    movable: false,
    hasShadow: false,
    thickFrame: false,
    focusable: false, // CRITICAL: don't steal focus from user's active window
    webPreferences: {
      preload: configuredPreloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true
    }
  })

  toolbarWindow.on('closed', () => {
    toolbarWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    toolbarWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/selectionToolbar.html')
  } else {
    toolbarWindow.loadFile(configuredRendererPath)
  }
}

function showToolbarAtPosition(point: Point): void {
  if (!isToolbarAlive()) {
    createToolbarWindow()
    toolbarWindow!.once('ready-to-show', () => {
      positionAndShow(point)
    })
    return
  }
  positionAndShow(point)
}

function positionAndShow(point: Point): void {
  if (!isToolbarAlive()) return

  const logicalPoint = screen.screenToDipPoint(point)
  const refX = Math.round(logicalPoint.x)
  const refY = Math.round(logicalPoint.y)

  const display = screen.getDisplayNearestPoint({ x: refX, y: refY })
  const { x: dX, y: dY, width: dW, height: dH } = display.workArea

  let posX = refX - Math.round(TOOLBAR_WIDTH / 2)
  let posY = refY + 12

  if (posX < dX) posX = dX
  if (posX + TOOLBAR_WIDTH > dX + dW) posX = dX + dW - TOOLBAR_WIDTH
  if (posY + TOOLBAR_HEIGHT > dY + dH) posY = refY - TOOLBAR_HEIGHT - 12

  toolbarWindow!.setBounds({
    x: posX,
    y: posY,
    width: TOOLBAR_WIDTH,
    height: TOOLBAR_HEIGHT
  })

  toolbarWindow!.setAlwaysOnTop(true, 'screen-saver')
  toolbarWindow!.showInactive() // Show without stealing focus

  toolbarWindow!.webContents.send('selection-text', selectedText)
  startHideListeners()
}

function hideToolbar(reason: 'mouse-down' | 'dismiss' = 'dismiss'): void {
  stopHideListeners()
  if (isToolbarAlive() && toolbarWindow!.isVisible()) {
    toolbarWindow!.hide()
  }
  lastHideTime = Date.now()
  lastHideReason = reason
}

// --- Hook-based click detection ---
// Because the window is focusable:false + transparent, Electron on Windows
// may not reliably deliver mouse events to the renderer. Instead, we handle
// all click logic in the main process using the native mouse hook.

function startHideListeners(): void {
  if (isListeningForHide || !selectionHook) return
  try {
    selectionHook.on('mouse-down', handleMouseDown)
    selectionHook.on('mouse-wheel', handleHideEvent)
    selectionHook.on('key-down', handleHideEvent)
    isListeningForHide = true
  } catch (e) {
    console.error('[Selection] Failed to start hide listeners:', e)
  }
}

function stopHideListeners(): void {
  if (!isListeningForHide || !selectionHook) return
  try {
    selectionHook.off('mouse-down', handleMouseDown)
    selectionHook.off('mouse-wheel', handleHideEvent)
    selectionHook.off('key-down', handleHideEvent)
    isListeningForHide = false
  } catch (e) {
    console.error('[Selection] Failed to stop hide listeners:', e)
  }
}

function handleMouseDown(): void {
  if (!isToolbarAlive() || !toolbarWindow!.isVisible()) return

  // getCursorScreenPoint returns DIP coordinates, same as getBounds
  const cursor = screen.getCursorScreenPoint()
  const bounds = toolbarWindow!.getBounds()

  if (
    cursor.x >= bounds.x && cursor.x <= bounds.x + bounds.width &&
    cursor.y >= bounds.y && cursor.y <= bounds.y + bounds.height
  ) {
    // Click INSIDE toolbar — determine which button by x-coordinate
    const relativeX = cursor.x - bounds.x
    
    // Width proportions based on CSS flex: translate(1), explain(1), search(1), copy(1.5)
    // Total proportions = 4.5
    const unitWidth = bounds.width / 4.5
    
    let action = 'copy'
    if (relativeX < unitWidth) {
      action = 'translate'
    } else if (relativeX < unitWidth * 2) {
      action = 'explain'
    } else if (relativeX < unitWidth * 3) {
      action = 'search'
    } else {
      action = 'copy'
    }

    if (action === 'copy') {
      if (selectedText) {
        clipboard.writeText(selectedText)
        // Tell renderer to show "已复制" feedback
        if (isToolbarAlive()) {
          toolbarWindow!.webContents.send('copy-success')
        }
        setTimeout(() => hideToolbar(), 600)
      }
    } else if (action === 'search') {
      const text = selectedText
      hideToolbar()
      if (text) {
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(text)}`
        shell.openExternal(searchUrl)
      }
    } else {
      const text = selectedText
      hideToolbar()
      const cb = onActionCallback
      if (cb && text) {
        setTimeout(() => cb(action, text), 100)
      }
    }
  } else {
    // Click OUTSIDE toolbar — hide it (likely start of a new text selection)
    hideToolbar('mouse-down')
  }
}

function handleHideEvent(): void {
  hideToolbar('dismiss')
}

function processTextSelection(selectionData: any): void {
  if (!selectionData.text || selectionData.text.trim().length === 0) return
  if (isToolbarAlive() && toolbarWindow!.isVisible()) return

  // Use shorter cooldown when hide was triggered by mouse-down (likely the start
  // of a new text selection), longer cooldown for scroll/key dismissals to prevent flicker.
  const cooldown = lastHideReason === 'mouse-down' ? 150 : 400
  if (Date.now() - lastHideTime < cooldown) return

  selectedText = selectionData.text

  let refPoint: Point = { x: 0, y: 0 }
  const posLevel = selectionData.posLevel

  if (posLevel === 0 || posLevel === undefined) {
    const cursor = screen.getCursorScreenPoint()
    refPoint = { x: cursor.x, y: cursor.y }
  } else if (posLevel === 1 || posLevel === 2) {
    refPoint = { x: selectionData.mousePosEnd.x, y: selectionData.mousePosEnd.y + 16 }
  } else {
    if (selectionData.endBottom) {
      refPoint = { x: selectionData.endBottom.x, y: selectionData.endBottom.y + 4 }
    } else {
      refPoint = { x: selectionData.mousePosEnd.x, y: selectionData.mousePosEnd.y + 16 }
    }
  }

  showToolbarAtPosition(refPoint)
}

let onActionCallback: ((action: string, text: string) => void) | null = null

export function setActionCallback(cb: (action: string, text: string) => void): void {
  onActionCallback = cb
}

function setupSelectionIPC(): void {
  // Backup IPC handlers — primary click handling is in handleMouseDown
  ipcMain.handle('selection-action', (_event, action: string) => {
    const text = selectedText
    hideToolbar()
    if (action === 'search' && text) {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(text)}`
      shell.openExternal(searchUrl)
      return true
    }
    const cb = onActionCallback
    if (cb && text) {
      setTimeout(() => cb(action, text), 100)
    }
    return true
  })

  ipcMain.handle('selection-copy', () => {
    if (selectedText) {
      clipboard.writeText(selectedText)
      return true
    }
    return false
  })

  ipcMain.handle('selection-hide-toolbar', () => {
    hideToolbar()
  })
}

export function startSelectionService(): boolean {
  if (!SelectionHook) {
    console.error('selection-hook module not available')
    return false
  }

  if (started) return true

  try {
    selectionHook = new SelectionHook()
    if (!selectionHook) return false

    createToolbarWindow()
    setupSelectionIPC()

    selectionHook.on('error', (error: any) => {
      console.error('SelectionHook error:', error)
    })

    selectionHook.on('text-selection', processTextSelection)

    if (selectionHook.start({ debug: false, enableClipboard: true })) {
      started = true
      console.log('SelectionService started successfully')
      return true
    }

    console.error('Failed to start selection hook')
    return false
  } catch (error) {
    console.error('Failed to initialize SelectionService:', error)
    return false
  }
}

export function stopSelectionService(): void {
  if (!selectionHook) return
  stopHideListeners()
  selectionHook.stop()
  selectionHook.cleanup()
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.close()
  }
  toolbarWindow = null
  selectionHook = null
  started = false
}
