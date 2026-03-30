import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X, Image as ImageIcon } from 'lucide-react'
import ThinkingButton, { type ThinkingEffort } from './ThinkingButton'

const ClaudeIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M32 4C33.2 19.6 44.4 30.8 60 32C44.4 33.2 33.2 44.4 32 60C30.8 44.4 19.6 33.2 4 32C19.6 30.8 30.8 19.6 32 4Z" fill="currentColor" />
  </svg>
)

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
  ({ value, onChange, onSubmit, placeholder, loading, isHome, thinkingEffort, onThinkingEffortChange, onArrowUp, onArrowDown, onBackspaceClear, images, onImagesChange }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef
    const [isDragOver, setIsDragOver] = useState(false)

    // Auto-resize textarea to fit content
    const autoResize = useCallback(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      // Clamp between 1 line (~24px) and ~4 lines (~96px)
      const maxHeight = 96
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }, [textareaRef])

    useEffect(() => {
      autoResize()
    }, [value, autoResize])

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
        // Shift+Enter: insert newline (default textarea behavior, don't prevent)
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
        // Remove last image if there are any and text is empty
        if (images && images.length > 0) {
          e.preventDefault()
          handleRemoveImage(images.length - 1)
          return
        }
        onBackspaceClear?.()
      }
    }

    const hasImages = images && images.length > 0

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
          <div className="input-icon no-drag">
            {loading ? (
              <Loader2 size={20} className="spinning" />
            ) : (
              <ClaudeIcon size={19} />
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
      </div>
    )
  }
)

InputBar.displayName = 'InputBar'
export default InputBar
