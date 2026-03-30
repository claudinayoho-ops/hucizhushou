import { globalShortcut } from 'electron'

let currentShortcut: string | null = null

export function registerShortcuts(shortcut: string, callback: () => void): void {
  try {
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut)
    }

    const registered = globalShortcut.register(shortcut, callback)
    if (registered) {
      currentShortcut = shortcut
      console.log(`Shortcut ${shortcut} registered successfully`)
    } else {
      console.error(`Failed to register shortcut: ${shortcut}`)
    }
  } catch (error) {
    console.error('Error registering shortcut:', error)
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
  currentShortcut = null
}
