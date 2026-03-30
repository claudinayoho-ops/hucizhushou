import { Tray, Menu, nativeImage, type App } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

function getTrayIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
}

export function createTray(showWindow: () => void, app: App): void {
  const icon = getTrayIcon()

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  buildTrayMenu(showWindow, app)

  tray.setToolTip('划词助手')

  tray.on('click', () => {
    showWindow()
  })
}

function buildTrayMenu(showWindow: () => void, app: App): void {
  if (!tray) return

  const isAutoStart = app.getLoginItemSettings().openAtLogin

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示划词助手',
      click: showWindow
    },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: isAutoStart,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          path: process.execPath,
          args: []
        })
        // Rebuild menu to reflect the new state
        buildTrayMenu(showWindow, app)
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

