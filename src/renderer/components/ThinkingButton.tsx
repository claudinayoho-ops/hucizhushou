import { useState, useRef, useEffect, useCallback } from 'react'

export type ThinkingEffort = 'default' | 'off' | 'low' | 'medium' | 'high'

const THINKING_OPTIONS: { value: ThinkingEffort; label: string; description: string }[] = [
  { value: 'default', label: '默认', description: '不干预模型思考行为' },
  { value: 'off', label: '关闭', description: '显式关闭深度思考' },
  { value: 'low', label: '简略', description: '思考预算 4K tokens' },
  { value: 'medium', label: '标准', description: '思考预算 40K tokens' },
  { value: 'high', label: '深度', description: '思考预算 64K tokens' }
]

interface ThinkingButtonProps {
  value: ThinkingEffort
  onChange: (value: ThinkingEffort) => void
}

export default function ThinkingButton({ value, onChange }: ThinkingButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  const isActive = value !== 'default' && value !== 'off'

  // Compute dropdown position when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 220
    let left = rect.right - dropdownWidth
    if (left < 4) left = 4
    setDropdownPos({ top: rect.bottom + 6, left })
  }, [isOpen])

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  const handleSelect = useCallback((opt: ThinkingEffort) => {
    onChange(opt)
    setIsOpen(false)
  }, [onChange])

  return (
    <div className="thinking-btn-container no-drag" ref={containerRef}>
      <button
        ref={triggerRef}
        className={`thinking-trigger ${isActive ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="思维链深度"
        type="button"
      >
        <ThinkingIcon effort={value} />
      </button>

      {isOpen && dropdownPos && (
        <div className="thinking-dropdown" style={{ top: dropdownPos.top, left: dropdownPos.left }}>
          <div className="thinking-dropdown-title">思维链深度</div>
          {THINKING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`thinking-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
              type="button"
            >
              <span className="thinking-option-icon">
                <ThinkingIcon effort={opt.value} size={16} />
              </span>
              <span className="thinking-option-body">
                <span className="thinking-option-label">{opt.label}</span>
                <span className="thinking-option-desc">{opt.description}</span>
              </span>
              {value === opt.value && (
                <span className="thinking-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Lightbulb SVG icon with visual state varying by effort level.
 * - default: question-mark bulb (neutral)
 * - off: dim outline bulb
 * - low/medium/high: increasingly bright filled bulb with rays
 */
function ThinkingIcon({ effort, size = 18 }: { effort: ThinkingEffort; size?: number }) {
  if (effort === 'default') {
    // Question-mark lightbulb — neutral "let model decide"
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M9 21h6M12 3a6 6 0 0 0-4 10.48V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.52A6 6 0 0 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <text
          x="12" y="13.5"
          textAnchor="middle"
          fill="currentColor"
          fontSize="8"
          fontWeight="700"
          fontFamily="sans-serif"
        >?</text>
      </svg>
    )
  }

  const getOpacity = () => {
    switch (effort) {
      case 'off': return 0.35
      case 'low': return 0.55
      case 'medium': return 0.75
      case 'high': return 1
    }
  }

  const isOff = effort === 'off'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: getOpacity() }}
    >
      <path
        d="M9 21h6M12 3a6 6 0 0 0-4 10.48V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3.52A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isOff ? 'none' : 'currentColor'}
        fillOpacity={isOff ? 0 : getOpacity()! * 0.2}
      />
      {!isOff && (
        <>
          <line x1="12" y1="1" x2="12" y2="0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={getOpacity()} />
          <line x1="4.22" y1="4.22" x2="3.51" y2="3.51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={getOpacity()} />
          <line x1="1" y1="12" x2="0" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={getOpacity()} />
          <line x1="23" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={getOpacity()} />
          <line x1="19.78" y1="4.22" x2="20.49" y2="3.51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={getOpacity()} />
        </>
      )}
    </svg>
  )
}
