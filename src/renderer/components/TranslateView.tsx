import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { streamChat, createTranslateMessages, type StreamCallbacks } from '../services/api'

interface TranslateViewProps {
  text: string
  onResultChange?: (result: string) => void
  onLoadingChange?: (loading: boolean) => void
  onAbortControllerChange?: (controller: AbortController | null) => void
}

const languages = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' }
]

export default function TranslateView({
  text,
  onResultChange,
  onLoadingChange,
  onAbortControllerChange
}: TranslateViewProps) {
  const [result, setResult] = useState('')
  const [targetLang, setTargetLang] = useState('zh-CN')
  const [isTargetLangReady, setIsTargetLangReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottomRef = useRef(true)

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const setAbortController = useCallback((controller: AbortController | null) => {
    abortRef.current = controller
    onAbortControllerChange?.(controller)
  }, [onAbortControllerChange])

  const updateStickiness = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distanceToBottom = scrollHeight - clientHeight - scrollTop
    shouldStickToBottomRef.current = distanceToBottom <= 40
  }, [])

  const doTranslate = useCallback(async () => {
    if (!text.trim()) return

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    setIsLoading(true)
    setResult('')
    setError(null)
    setAbortController(new AbortController())

    const messages = createTranslateMessages(text, languages.find(l => l.code === targetLang)?.label || '中文')

    const callbacks: StreamCallbacks = {
      onToken: (_token, fullText) => {
        setResult(fullText)
      },
      onComplete: (fullText) => {
        setIsLoading(false)
        const trimmed = fullText.trim()
        if (!trimmed) {
          setAbortController(null)
          setError('翻译结果为空，请检查 API 配置后重试')
          return
        }
        setResult(trimmed)
        setAbortController(null)
        onResultChange?.(trimmed)
      },
      onAbort: (fullText) => {
        setIsLoading(false)
        setResult(fullText)
        setAbortController(null)
        onResultChange?.(fullText)
      },
      onError: (err) => {
        setIsLoading(false)
        setAbortController(null)
        setError(err.message)
      }
    }

    await streamChat(messages, callbacks, abortRef.current?.signal, 'off', { useTranslateModel: true })
  }, [onResultChange, setAbortController, targetLang, text])

  // Load saved target language
  useEffect(() => {
    (async () => {
      const saved = await window.api.getConfig('targetLanguage') as string
      if (saved) setTargetLang(saved)
      setIsTargetLangReady(true)
    })()
  }, [])

  // Auto-translate when text or language changes
  useEffect(() => {
    if (!isTargetLangReady) {
      return
    }

    doTranslate()
    return () => {
      if (abortRef.current) abortRef.current.abort()
      onAbortControllerChange?.(null)
    }
  }, [doTranslate, isTargetLangReady, onAbortControllerChange])

  // Auto-scroll
  useEffect(() => {
    if (shouldStickToBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [result])

  useEffect(() => {
    updateStickiness()
  }, [isLoading, updateStickiness])

  const handleLanguageChange = async (code: string) => {
    setTargetLang(code)
    await window.api.setConfig('targetLanguage', code)
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result)
    }
  }

  return (
    <div className="translate-view">
      <div className="translate-header drag-region">
        <div className="translate-controls no-drag">
          <div className="translate-lang-badge">自动检测</div>
          <span className="translate-arrow">→</span>
          <select
            className="translate-select"
            value={targetLang}
            onChange={e => handleLanguageChange(e.target.value)}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div className="translate-drag-spacer" aria-hidden="true" />
      </div>

      <div className="translate-content" ref={scrollRef} onScroll={updateStickiness}>
        {isLoading && !result && (
          <div className="translate-loading">
            <Loader2 size={16} className="spinning" />
            <span>正在翻译...</span>
          </div>
        )}

        {result && (
          <div className="translate-result animate-fade-in" onClick={handleCopy} title="点击复制">
            {result}
          </div>
        )}

        {error && (
          <div className="chat-error animate-fade-in">
            <span>⚠️ {error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
