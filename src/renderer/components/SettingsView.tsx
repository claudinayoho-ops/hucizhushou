import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Eye, EyeOff, Check, Keyboard, Plus, X } from 'lucide-react'
import { applyThemePreferences, themeColorOptions } from '../utils/theme'

interface SettingsViewProps {
  onBack: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState('')
  const [apiHost, setApiHost] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4o-mini')
  const [modelList, setModelList] = useState<string[]>(['gpt-4o-mini'])
  const [translateModel, setTranslateModel] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [showAddModel, setShowAddModel] = useState(false)
  const [shortcut, setShortcut] = useState('Alt+Space')
  const [theme, setTheme] = useState('system')
  const [themeColor, setThemeColor] = useState('indigo')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)

  const addModelInputRef = useRef<HTMLInputElement>(null)

  // Load config on mount
  useEffect(() => {
    (async () => {
      const config = await window.api.getAllConfig() as Record<string, unknown>
      if (config.apiKey) setApiKey(config.apiKey as string)
      if (config.apiHost) setApiHost(config.apiHost as string)
      if (config.model) setModel(config.model as string)
      if (config.modelList) setModelList(config.modelList as string[])
      if (config.translateModel !== undefined) setTranslateModel(config.translateModel as string)
      if (config.shortcut) setShortcut(config.shortcut as string)
      if (config.theme) setTheme(config.theme as string)
      if (config.themeColor) setThemeColor(config.themeColor as string)
    })()
  }, [])

  // Focus the add-model input when it becomes visible
  useEffect(() => {
    if (showAddModel) {
      setTimeout(() => addModelInputRef.current?.focus(), 50)
    }
  }, [showAddModel])

  const handleSave = async () => {
    await window.api.setConfig('apiKey', apiKey)
    await window.api.setConfig('apiHost', apiHost)
    await window.api.setConfig('model', model)
    await window.api.setConfig('modelList', modelList)
    await window.api.setConfig('translateModel', translateModel)
    await window.api.setConfig('shortcut', shortcut)
    await window.api.setConfig('theme', theme)
    await window.api.setConfig('themeColor', themeColor)

    applyThemePreferences(theme, themeColor)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddModel = () => {
    const name = newModelName.trim()
    if (!name || modelList.includes(name)) {
      setNewModelName('')
      setShowAddModel(false)
      return
    }
    const updated = [...modelList, name]
    setModelList(updated)
    setNewModelName('')
    setShowAddModel(false)
  }

  const handleRemoveModel = (modelName: string) => {
    const updated = modelList.filter(m => m !== modelName)
    setModelList(updated.length > 0 ? updated : ['gpt-4o-mini'])
    // If we removed the active default model, pick the first remaining
    if (model === modelName) {
      setModel(updated.length > 0 ? updated[0] : 'gpt-4o-mini')
    }
    // If we removed the translate model, clear it
    if (translateModel === modelName) {
      setTranslateModel('')
    }
  }

  const handleShortcutRecord = (e: React.KeyboardEvent) => {
    if (!isRecordingShortcut) return
    e.preventDefault()

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')

    const key = e.key
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key)
      setShortcut(parts.join('+'))
      setIsRecordingShortcut(false)
    }
  }

  return (
    <div className="settings-view animate-fade-in">
      <div className="settings-header drag-region">
        <button className="settings-back no-drag" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <h2 className="settings-title">设置</h2>
        <button className="settings-save no-drag" onClick={handleSave}>
          {saved ? <Check size={16} /> : '保存'}
        </button>
      </div>

      <div className="settings-body">
        {/* API Configuration */}
        <div className="settings-section">
          <h3 className="settings-section-title">API 配置</h3>

          <div className="settings-field">
            <label className="settings-label">API Host</label>
            <input
              className="settings-input"
              value={apiHost}
              onChange={e => setApiHost(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <span className="settings-hint">支持 OpenAI 兼容格式的 API 地址</span>
          </div>

          <div className="settings-field">
            <label className="settings-label">API Key</label>
            <div className="settings-input-group">
              <input
                className="settings-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                className="settings-input-action"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Model Management */}
        <div className="settings-section">
          <h3 className="settings-section-title">模型管理</h3>

          {/* Model chips list */}
          <div className="settings-field">
            <label className="settings-label">已添加模型</label>
            <div className="model-chip-list">
              {modelList.map(m => (
                <div key={m} className={`model-chip ${model === m ? 'active' : ''}`}>
                  <span className="model-chip-name">{m}</span>
                  {modelList.length > 1 && (
                    <button
                      className="model-chip-remove"
                      onClick={() => handleRemoveModel(m)}
                      title="移除模型"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {showAddModel ? (
                <div className="model-chip-add-input">
                  <input
                    ref={addModelInputRef}
                    className="model-add-field"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddModel()
                      if (e.key === 'Escape') { setShowAddModel(false); setNewModelName('') }
                    }}
                    onBlur={handleAddModel}
                    placeholder="输入模型名称..."
                  />
                </div>
              ) : (
                <button
                  className="model-chip model-chip-add"
                  onClick={() => setShowAddModel(true)}
                >
                  <Plus size={13} />
                  <span>添加</span>
                </button>
              )}
            </div>
            <span className="settings-hint">点击「添加」输入模型 ID，如 deepseek-chat、claude-3-5-sonnet 等</span>
          </div>

          {/* Default model selector */}
          <div className="settings-field">
            <label className="settings-label">默认模型</label>
            <select
              className="settings-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {modelList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="settings-hint">用于问答、总结、解释等功能</span>
          </div>

          {/* Translation model selector */}
          <div className="settings-field">
            <label className="settings-label">翻译模型</label>
            <select
              className="settings-select"
              value={translateModel}
              onChange={e => setTranslateModel(e.target.value)}
            >
              <option value="">跟随默认模型</option>
              {modelList.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="settings-hint">翻译功能单独使用的模型，留空则跟随默认</span>
          </div>
        </div>

        {/* Shortcut */}
        <div className="settings-section">
          <h3 className="settings-section-title">快捷键</h3>
          <div className="settings-field">
            <label className="settings-label">全局唤起快捷键</label>
            <div className="settings-input-group">
              <input
                className={`settings-input ${isRecordingShortcut ? 'recording' : ''}`}
                value={isRecordingShortcut ? '请按下快捷键...' : shortcut}
                readOnly
                onKeyDown={handleShortcutRecord}
                onClick={() => setIsRecordingShortcut(!isRecordingShortcut)}
              />
              <button
                className="settings-input-action"
                onClick={() => setIsRecordingShortcut(!isRecordingShortcut)}
              >
                <Keyboard size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="settings-section">
          <h3 className="settings-section-title">外观</h3>
          <div className="settings-field">
            <label className="settings-label">亮度模式</label>
            <div className="settings-theme-group">
              {[
                { value: 'system', label: '跟随系统' },
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' }
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`settings-theme-btn ${theme === opt.value ? 'active' : ''}`}
                  onClick={() => setTheme(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">主题颜色</label>
            <div className="settings-palette-grid">
              {themeColorOptions.map(option => (
                <button
                  key={option.value}
                  className={`settings-palette-card ${themeColor === option.value ? 'active' : ''}`}
                  onClick={() => setThemeColor(option.value)}
                >
                  <div className="settings-palette-swatches">
                    {option.swatches.map(color => (
                      <span
                        key={color}
                        className="settings-palette-swatch"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="settings-palette-copy">
                    <span className="settings-palette-title">{option.label}</span>
                    <span className="settings-palette-desc">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
            <span className="settings-hint">保存后立即应用到主窗口和划词工具栏。</span>
          </div>
        </div>
      </div>
    </div>
  )
}
