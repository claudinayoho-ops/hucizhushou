import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X, ChevronDown, Check } from 'lucide-react'
import ThinkingButton, { type ThinkingEffort } from './ThinkingButton'
import { ProviderIcon, detectProvider } from '../utils/providers'
import type { ModelItem } from '../types/provider'

interface InputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  loading: boolean
  isHome?: boolean
  thinkingEffort?: ThinkingEffort
  onThinkingEffortChange?: (value: ThinkingEffort) => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onBackspaceClear?: () => void
  /** Attached images (base64 data URLs) */
  images?: string[]
  onImagesChange?: (images: string[]) => void
  /** Model switching */
  currentModel?: string
  modelList?: ModelItem[]
  onModelChange?: (model: string) => void
}

/** Convert a File/Blob to a data URL */
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const InputBar = forwardRef<HTMLTextAreaElement, InputBarProps>(
  ({ value, onChange, onSubmit, placeholder, loading, isHome, thinkingEffort, onThinkingEffortChange, onArrowUp, onArrowDown, onBackspaceClear, images, onImagesChange, currentModel, modelList, onModelChange }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef
    const [showModelPicker, setShowModelPicker] = useState(false)
    const modelBtnRef = useRef<HTMLDivElement>(null)
    const modelDropdownRef = useRef<HTMLDivElement>(null)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

    // Auto-resize textarea to fit content
    const autoResize = useCallback(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      const maxHeight = 96
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }, [textareaRef])

    useEffect(() => {
      autoResize()
    }, [value, autoResize])

    // Close model picker on outside click
    useEffect(() => {
      if (!showModelPicker) return
      const handler = (e: MouseEvent) => {
        if (
          modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node) &&
          modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node)
        ) {
          setShowModelPicker(false)
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [showModelPicker])

    const toggleModelPicker = useCallback(() => {
      if (showModelPicker) {
        setShowModelPicker(false)
        return
      }
      // Calculate position
      if (modelBtnRef.current) {
        const rect = modelBtnRef.current.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 4, left: rect.left })
      }
      setShowModelPicker(true)
    }, [showModelPicker])

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      const imageFiles: File[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }

      if (imageFiles.length === 0) return

      e.preventDefault()

      const dataUrls = await Promise.all(imageFiles.map(f => fileToDataUrl(f)))
      const current = images || []
      onImagesChange?.([...current, ...dataUrls])
    }, [images, onImagesChange])

    const handleRemoveImage = useCallback((index: number) => {
      const updated = (images || []).filter((_, i) => i !== index)
      onImagesChange?.(updated)
    }, [images, onImagesChange])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing || e.key === 'Process') return

      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && e.shiftKey) {
        return
      }

      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        if (!loading) onSubmit()
        return
      }

      if (e.code === 'ArrowUp' && isHome) {
        e.preventDefault()
        onArrowUp?.()
        return
      }

      if (e.code === 'ArrowDown' && isHome) {
        e.preventDefault()
        onArrowDown?.()
        return
      }

      if (e.code === 'Backspace' && value.length === 0) {
        if (images && images.length > 0) {
          e.preventDefault()
          handleRemoveImage(images.length - 1)
          return
        }
        onBackspaceClear?.()
      }
    }

    const hasImages = images && images.length > 0
    const hasModelSwitcher = modelList && modelList.length > 1 && onModelChange
    const displayModel = currentModel || ''

    return (
      <div className={`input-bar ${hasImages ? 'input-bar-with-images' : ''}`}>
        {/* Image preview strip */}
        {hasImages && (
          <div className="input-image-strip no-drag">
            {images!.map((src, idx) => (
              <div key={idx} className="input-image-thumb">
                <img src={src} alt={`附件 ${idx + 1}`} />
                <button
                  className="input-image-remove"
                  onClick={() => handleRemoveImage(idx)}
                  title="移除图片"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="input-bar-row">
          <div
            ref={modelBtnRef}
            className={`input-icon no-drag ${hasModelSwitcher ? 'input-icon-clickable' : ''}`}
            onClick={hasModelSwitcher ? toggleModelPicker : undefined}
            title={hasModelSwitcher ? `当前模型: ${displayModel}\n点击切换` : displayModel}
          >
            {loading ? (
              <Loader2 size={20} className="spinning" />
            ) : (
              <ProviderIcon modelId={displayModel} size={19} />
            )}
            {hasModelSwitcher && !loading && (
              <ChevronDown size={10} className="input-icon-caret" />
            )}
          </div>
          <textarea
            ref={textareaRef}
            className="input-field no-drag"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            autoFocus
            disabled={loading}
            rows={1}
          />
          {thinkingEffort !== undefined && onThinkingEffortChange && (
            <ThinkingButton
              value={thinkingEffort}
              onChange={onThinkingEffortChange}
            />
          )}
        </div>

        {/* Model picker dropdown */}
        {showModelPicker && hasModelSwitcher && dropdownPos && (
          <div
            ref={modelDropdownRef}
            className="model-picker-dropdown"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            <div className="model-picker-title">切换模型</div>
            {modelList!.map(m => {
              const provider = detectProvider(m.id)
              const isActive = m.id === currentModel
              return (
                <button
                  key={m.id}
                  className={`model-picker-option ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onModelChange!(m.id)
                    setShowModelPicker(false)
                  }}
                >
                  <ProviderIcon modelId={m.id} size={16} />
                  <div className="model-picker-option-body">
                    <span className="model-picker-option-name">{m.id}</span>
                    <span className="model-picker-option-provider">{provider.name}</span>
                  </div>
                  {isActive && <Check size={14} className="model-picker-check" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)

InputBar.displayName = 'InputBar'
export default InputBar
