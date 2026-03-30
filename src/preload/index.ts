import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Config
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('set-config', key, value),
  getAllConfig: () => ipcRenderer.invoke('get-all-config'),

  // Window
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  getClipboard: () => ipcRenderer.invoke('get-clipboard'),

  // Selection toolbar actions
  selectionAction: (action: string) => ipcRenderer.invoke('selection-action', action),
  selectionCopy: () => ipcRenderer.invoke('selection-copy'),
  selectionHideToolbar: () => ipcRenderer.invoke('selection-hide-toolbar'),

  // Event listeners
  onWindowShow: (callback: (clipboardText: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on('window-show', handler)
    return () => ipcRenderer.removeListener('window-show', handler)
  },
  onWindowBlur: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window-blur', handler)
    return () => ipcRenderer.removeListener('window-blur', handler)
  },
  onSelectionText: (callback: (text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
    ipcRenderer.on('selection-text', handler)
    return () => ipcRenderer.removeListener('selection-text', handler)
  },
  onSelectionAction: (callback: (action: string, text: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string, text: string) => callback(action, text)
    ipcRenderer.on('selection-action-trigger', handler)
    return () => ipcRenderer.removeListener('selection-action-trigger', handler)
  },
  onCopySuccess: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('copy-success', handler)
    return () => ipcRenderer.removeListener('copy-success', handler)
  }
})

// Type declarations for the renderer
export interface ElectronAPI {
  getConfig: (key: string) => Promise<unknown>
  setConfig: (key: string, value: unknown) => Promise<void>
  getAllConfig: () => Promise<Record<string, unknown>>
  hideWindow: () => Promise<void>
  getClipboard: () => Promise<string>

  // Selection toolbar
  selectionAction: (action: string) => Promise<void>
  selectionCopy: () => Promise<boolean>
  selectionHideToolbar: () => Promise<void>

  // Events
  onWindowShow: (callback: (clipboardText: string) => void) => () => void
  onWindowBlur: (callback: () => void) => () => void
  onSelectionText: (callback: (text: string) => void) => () => void
  onSelectionAction: (callback: (action: string, text: string) => void) => () => void
  onCopySuccess: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
