import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Eye, EyeOff, Check, Keyboard, Plus, X, ChevronDown, ChevronRight, Server } from 'lucide-react'
import { applyThemePreferences, themeColorOptions } from '../utils/theme'
import type { Provider, ModelItem } from '../types/provider'
import { generateProviderId } from '../types/provider'
import { ProviderIcon, detectProvider } from '../utils/providers'

interface SettingsViewProps {
  onBack: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [model, setModel] = useState('gpt-4o-mini')
  const [modelList, setModelList] = useState<ModelItem[]>([])
  const [translateModel, setTranslateModel] = useState('')
  const [newModelName, setNewModelName] = useState('')
  const [newModelProvider, setNewModelProvider] = useState('')
  const [showAddModel, setShowAddModel] = useState(false)
  const [shortcut, setShortcut] = useState('Alt+Space')
  const [theme, setTheme] = useState('system')
  const [themeColor, setThemeColor] = useState('indigo')
  const [saved, setSaved] = useState(false)
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})

  // Add-provider state
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProviderName, setNewProviderName] = useState('')
  const [newProviderHost, setNewProviderHost] = useState('https://api.openai.com/v1')
  const [newProviderKey, setNewProviderKey] = useState('')

  const addModelInputRef = useRef<HTMLInputElement>(null)
  const addProviderNameRef = useRef<HTMLInputElement>(null)

  // Load config on mount
  useEffect(() => {
    (async () => {
      const config = await window.api.getAllConfig() as Record<string, unknown>
      if (config.providers) setProviders(config.providers as Provider[])
      if (config.model) setModel(config.model as string)
      if (config.modelList) setModelList(config.modelList as ModelItem[])
      if (config.translateModel !== undefined) setTranslateModel(config.translateModel as string)
      if (config.shortcut) setShortcut(config.shortcut as string)
      if (config.theme) setTheme(config.theme as string)
      if (config.themeColor) setThemeColor(config.themeColor as string)

      // Auto-expand first provider, set default new model provider
      const provs = config.providers as Provider[] || []
      if (provs.length > 0) {
        setExpandedProvider(provs[0].id)
        setNewModelProvider(provs[0].id)
      }
    })()
  }, [])

  // Focus add-model input
  useEffect(() => {
    if (showAddModel) {
      setTimeout(() => addModelInputRef.current?.focus(), 50)
    }
  }, [showAddModel])

  // Focus add-provider input
  useEffect(() => {
    if (showAddProvider) {
      setTimeout(() => addProviderNameRef.current?.focus(), 50)
    }
  }, [showAddProvider])

  const handleSave = async () => {
    await window.api.setConfig('providers', providers)
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

  // Provider CRUD
  const handleAddProvider = () => {
    const name = newProviderName.trim()
    if (!name) return
    const newProvider: Provider = {
      id: generateProviderId(),
      name,
      apiHost: newProviderHost.trim() || 'https://api.openai.com/v1',
      apiKey: newProviderKey.trim()
    }
    setProviders(prev => [...prev, newProvider])
    setExpandedProvider(newProvider.id)
    if (!newModelProvider) setNewModelProvider(newProvider.id)
    setNewProviderName('')
    setNewProviderHost('https://api.openai.com/v1')
    setNewProviderKey('')
    setShowAddProvider(false)
  }

  const handleDeleteProvider = (providerId: string) => {
    // Remove provider
    setProviders(prev => prev.filter(p => p.id !== providerId))
    // Remove models associated with this provider
    setModelList(prev => {
      const remaining = prev.filter(m => m.providerId !== providerId)
      // If active model was removed, switch to first remaining
      if (!remaining.find(m => m.id === model) && remaining.length > 0) {
        setModel(remaining[0].id)
      }
      if (!remaining.find(m => m.id === translateModel)) {
        setTranslateModel('')
      }
      return remaining
    })
    if (expandedProvider === providerId) {
      setExpandedProvider(null)
    }
  }

  const handleUpdateProvider = (providerId: string, field: keyof Provider, value: string) => {
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, [field]: value } : p))
  }

  // Model CRUD
  const handleAddModel = () => {
    const name = newModelName.trim()
    if (!name || modelList.find(m => m.id === name)) {
      setNewModelName('')
      setShowAddModel(false)
      return
    }
    const providerId = newModelProvider || providers[0]?.id || ''
    const updated: ModelItem[] = [...modelList, { id: name, providerId }]
    setModelList(updated)
    setNewModelName('')
    setShowAddModel(false)
  }

  const handleRemoveModel = (modelId: string) => {
    const updated = modelList.filter(m => m.id !== modelId)
    setModelList(updated.length > 0 ? updated : [])
    if (model === modelId) {
      setModel(updated.length > 0 ? updated[0].id : '')
    }
    if (translateModel === modelId) {
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

  const getProviderName = (providerId: string) => {
    return providers.find(p => p.id === providerId)?.name || '未知'
  }

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
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
        {/* Provider Management */}
        <div className="settings-section">
          <h3 className="settings-section-title">供应商管理</h3>
          <span className="settings-hint" style={{ marginBottom: 8, display: 'block' }}>
            每个供应商拥有独立的 API 地址和密钥，模型需关联到一个供应商
          </span>

          <div className="provider-list">
            {providers.map(provider => {
              const isExpanded = expandedProvider === provider.id
              const providerModels = modelList.filter(m => m.providerId === provider.id)
              return (
                <div key={provider.id} className="provider-card">
                  <div
                    className="provider-card-header"
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                  >
                    <div className="provider-card-title">
                      <Server size={14} className="provider-card-icon" />
                      <span className="provider-card-name">{provider.name}</span>
                      <span className="provider-card-badge">{providerModels.length} 个模型</span>
                    </div>
                    <div className="provider-card-actions">
                      {providers.length > 1 && (
                        <button
                          className="provider-card-delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteProvider(provider.id) }}
                          title="删除供应商"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="provider-card-body">
                      <div className="settings-field">
                        <label className="settings-label">名称</label>
                        <input
                          className="settings-input"
                          value={provider.name}
                          onChange={e => handleUpdateProvider(provider.id, 'name', e.target.value)}
                          placeholder="供应商名称"
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-label">API Host</label>
                        <input
                          className="settings-input"
                          value={provider.apiHost}
                          onChange={e => handleUpdateProvider(provider.id, 'apiHost', e.target.value)}
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div className="settings-field">
                        <label className="settings-label">
                          API Key
                          {(() => {
                            const keyCount = provider.apiKey.split(',').map(k => k.trim()).filter(Boolean).length
                            return keyCount > 1 ? <span className="provider-key-count">{keyCount} 个密钥 · 轮询</span> : null
                          })()}
                        </label>
                        <div className="settings-input-group">
                          <input
                            className="settings-input"
                            type={showApiKeys[provider.id] ? 'text' : 'password'}
                            value={provider.apiKey}
                            onChange={e => handleUpdateProvider(provider.id, 'apiKey', e.target.value)}
                            placeholder="sk-..."
                          />
                          <button
                            className="settings-input-action"
                            onClick={() => toggleApiKeyVisibility(provider.id)}
                          >
                            {showApiKeys[provider.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        <span className="settings-hint">支持多个密钥，用英文逗号分隔，自动轮询切换</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Provider */}
            {showAddProvider ? (
              <div className="provider-card provider-card-new">
                <div className="provider-card-body">
                  <div className="settings-field">
                    <label className="settings-label">供应商名称</label>
                    <input
                      ref={addProviderNameRef}
                      className="settings-input"
                      value={newProviderName}
                      onChange={e => setNewProviderName(e.target.value)}
                      placeholder="如：DeepSeek、阿里云百炼…"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddProvider()
                        if (e.key === 'Escape') { setShowAddProvider(false); setNewProviderName(''); setNewProviderHost('https://api.openai.com/v1'); setNewProviderKey('') }
                      }}
                    />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">API Host</label>
                    <input
                      className="settings-input"
                      value={newProviderHost}
                      onChange={e => setNewProviderHost(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">API Key</label>
                    <input
                      className="settings-input"
                      type="password"
                      value={newProviderKey}
                      onChange={e => setNewProviderKey(e.target.value)}
                      placeholder="sk-...（多个密钥用逗号分隔）"
                    />
                    <span className="settings-hint">支持用英文逗号分隔多个 Key，自动轮询</span>
                  </div>
                  <div className="provider-card-footer">
                    <button className="provider-btn provider-btn-cancel" onClick={() => { setShowAddProvider(false); setNewProviderName(''); setNewProviderHost('https://api.openai.com/v1'); setNewProviderKey('') }}>
                      取消
                    </button>
                    <button className="provider-btn provider-btn-confirm" onClick={handleAddProvider}>
                      添加
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="provider-add-btn"
                onClick={() => setShowAddProvider(true)}
              >
                <Plus size={14} />
                <span>添加供应商</span>
              </button>
            )}
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
                <div key={m.id} className={`model-chip ${model === m.id ? 'active' : ''}`}>
                  <ProviderIcon modelId={m.id} size={14} />
                  <span className="model-chip-name">{m.id}</span>
                  <span className="model-chip-provider-tag">{getProviderName(m.providerId)}</span>
                  {modelList.length > 1 && (
                    <button
                      className="model-chip-remove"
                      onClick={() => handleRemoveModel(m.id)}
                      title="移除模型"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {showAddModel ? (
                <div
                  className="model-chip-add-input"
                  onBlur={(e) => {
                    // Only close if focus moved outside this container entirely
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      handleAddModel()
                    }
                  }}
                >
                  <input
                    ref={addModelInputRef}
                    className="model-add-field"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddModel()
                      if (e.key === 'Escape') { setShowAddModel(false); setNewModelName('') }
                    }}
                    placeholder="输入模型名称..."
                  />
                  <select
                    className="model-add-provider-select"
                    value={newModelProvider}
                    onChange={e => setNewModelProvider(e.target.value)}
                    title="选择供应商"
                  >
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
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
            <span className="settings-hint">添加模型时选择所属供应商，确保 API 请求路由正确</span>
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
                <option key={m.id} value={m.id}>{m.id}（{getProviderName(m.providerId)}）</option>
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
                <option key={m.id} value={m.id}>{m.id}（{getProviderName(m.providerId)}）</option>
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
