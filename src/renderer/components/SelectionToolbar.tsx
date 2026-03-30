import { useCallback, useEffect, useState } from 'react'
import { applyThemePreferences } from '../utils/theme'

const actions = [
  { id: 'translate', label: '译' },
  { id: 'explain', label: '释' },
  { id: 'search', label: '搜' },
]

export default function SelectionToolbar() {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle')

  const syncTheme = useCallback(async () => {
    if (!window.api?.getAllConfig) {
      return
    }

    const config = await window.api.getAllConfig() as Record<string, unknown>
    applyThemePreferences(
      (config.theme as string) || 'system',
      (config.themeColor as string) || 'indigo'
    )
  }, [])

  useEffect(() => {
    void syncTheme()

    if (window.api?.onSelectionText) {
      return window.api.onSelectionText(() => {
        setCopyStatus('idle')
        void syncTheme()
      })
    }
  }, [syncTheme])

  // Listen for copy-success from main process (hook-based click handling)
  useEffect(() => {
    const handler = () => {
      setCopyStatus('success')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
    return window.api?.onCopySuccess?.(handler)
  }, [])

  const handleAction = useCallback(async (action: string) => {
    try {
      await window.api?.selectionAction(action)
    } catch (err) {
      console.error('[Toolbar] selectionAction error:', err)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      const success = await window.api?.selectionCopy()
      if (success) {
        setCopyStatus('success')
        setTimeout(() => setCopyStatus('idle'), 2000)
      }
    } catch (err) {
      console.error('[Toolbar] selectionCopy error:', err)
    }
  }, [])

  return (
    <div className="toolbar-container">
      <div className="toolbar-actions">
        {actions.map((action) => (
          <div
            key={action.id}
            className="toolbar-btn"
            onClick={() => handleAction(action.id)}
            role="button"
            tabIndex={0}
            title={action.label}
          >
            <span className="btn-text">{action.label}</span>
          </div>
        ))}
        <div
          className={`toolbar-btn ${copyStatus === 'success' ? 'copy-success' : ''}`}
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          title="复制"
        >
          <span className="btn-text">{copyStatus === 'success' ? '已复制' : '复制'}</span>
        </div>
      </div>
    </div>
  )
}
