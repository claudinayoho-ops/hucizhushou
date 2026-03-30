import React, { useState, useEffect, useCallback, useRef } from 'react'
import InputBar from './components/InputBar'
import FeatureMenu from './components/FeatureMenu'
import ClipboardPreview from './components/ClipboardPreview'
import ChatView from './components/ChatView'
import type { DisplayMessage } from './components/ChatView'
import TranslateView from './components/TranslateView'
import Footer from './components/Footer'
import SettingsView from './components/SettingsView'
import { applyThemePreferences } from './utils/theme'
import type { ThinkingEffort } from './components/ThinkingButton'
import {
  streamChat,
  createChatMessages,
  createSummaryMessages,
  createExplanationMessages,
  appendUserMessage,
  appendAssistantMessage,
  type ChatMessage,
  type StreamCallbacks
} from './services/api'

type Route = 'home' | 'chat' | 'translate' | 'summary' | 'explanation' | 'settings'

export default function App() {
  const [route, setRoute] = useState<Route>('home')
  const [clipboardText, setClipboardText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [isFirstMessage, setIsFirstMessage] = useState(true)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const [selectedFeature, setSelectedFeature] = useState(0)
  const [translateResult, setTranslateResult] = useState('')
  const [isTranslateLoading, setIsTranslateLoading] = useState(false)
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>('default')
  const [streamThinking, setStreamThinking] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const translateAbortRef = useRef<AbortController | null>(null)
  const thinkingRef = useRef('')

  // The reference text is either clipboard or user input
  const referenceText = clipboardText || userInput

  // Apply theme on mount & load thinking effort
  useEffect(() => {
    if (!window.api) return
    ;(async () => {
      const config = await window.api.getAllConfig() as Record<string, unknown>
      applyThemePreferences(
        (config.theme as string) || 'system',
        (config.themeColor as string) || 'indigo'
      )
      if (config.thinkingEffort) {
        setThinkingEffort(config.thinkingEffort as ThinkingEffort)
      }
    })()
  }, [])

  // Persist thinking effort changes
  const handleThinkingEffortChange = useCallback((value: ThinkingEffort) => {
    setThinkingEffort(value)
    window.api?.setConfig('thinkingEffort', value)
  }, [])

  const handleTranslateAbortControllerChange = useCallback((controller: AbortController | null) => {
    translateAbortRef.current = controller
  }, [])

  // Listen for window show events
  useEffect(() => {
    if (!window.api) return
    const unsub = window.api.onWindowShow((text: string) => {
      if (text) setClipboardText(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    })
    return unsub
  }, [])

  // Listen for window blur events
  useEffect(() => {
    if (!window.api) return
    const unsub = window.api.onWindowBlur(() => {
      if (!isPinned) {
        window.api.hideWindow()
      }
    })
    return unsub
  }, [isPinned])

  // Listen for selection-action events (from toolbar)
  useEffect(() => {
    if (!window.api) return
    const unsub = window.api.onSelectionAction?.((action: string, text: string) => {
      if (text) {
        setClipboardText(text)
        setUserInput('')
      }
      // Route to the appropriate feature
      switch (action) {
        case 'translate':
          setRoute('translate')
          break
        case 'explain':
          setRoute('explanation')
          // Need to trigger after state update
          setTimeout(() => {
            handleSendMessageDirect(text, '__explanation__')
          }, 50)
          break
        case 'summary':
          setRoute('summary')
          setTimeout(() => {
            handleSendMessageDirect(text, '__summary__')
          }, 50)
          break
        case 'chat':
        default:
          setRoute('chat')
          setTimeout(() => {
            handleSendMessageDirect(text)
          }, 50)
          break
      }
    })
    return unsub
  }, [])

  // Reset when going home
  useEffect(() => {
    if (route === 'home') {
      setIsFirstMessage(true)
      setError(null)
      setStreamText('')
      setStreamThinking('')
      setChatHistory([])
      setDisplayMessages([])
    }
  }, [route])

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const commitAssistantResponse = useCallback((messages: ChatMessage[], fullText: string) => {
    abortRef.current = null
    setIsLoading(false)
    setStreamText('')

    const savedThinking = thinkingRef.current
    thinkingRef.current = ''
    setStreamThinking('')

    if (!fullText) {
      focusInput()
      return
    }

    setDisplayMessages(prev => [...prev, { role: 'assistant', content: fullText, thinking: savedThinking || undefined }])
    setChatHistory(appendAssistantMessage(messages, fullText))
    focusInput()
  }, [focusInput])

  const clearClipboard = useCallback(() => {
    setClipboardText('')
    focusInput()
  }, [focusInput])

  // Direct message send (used by selection toolbar action)
  const handleSendMessageDirect = useCallback(async (text: string, prompt?: string) => {
    if (!text.trim()) return

    let messages: ChatMessage[]
    if (prompt === '__summary__') {
      messages = createSummaryMessages(text)
    } else if (prompt === '__explanation__') {
      messages = createExplanationMessages(text)
    } else {
      messages = createChatMessages(text, undefined, [])
    }

    // Add user message to display
    if (!prompt || prompt === '') {
      setDisplayMessages(prev => [...prev, { role: 'user', content: text }])
    }

    setIsLoading(true)
    setError(null)
    setStreamText('')
    setStreamThinking('')
    setIsFirstMessage(false)

    const abort = new AbortController()
    abortRef.current = abort

    const callbacks: StreamCallbacks = {
      onToken: (_token, fullText) => {
        setStreamText(fullText)
      },
      onThinkingToken: (_token, fullThinking) => {
        thinkingRef.current = fullThinking
        setStreamThinking(fullThinking)
      },
      onThinkingComplete: () => {
        // Keep thinking text visible until commitAssistantResponse saves it
      },
      onComplete: (fullText) => {
        commitAssistantResponse(messages, fullText)
      },
      onAbort: (fullText) => {
        commitAssistantResponse(messages, fullText)
      },
      onError: (err) => {
        abortRef.current = null
        setIsLoading(false)
        thinkingRef.current = ''
        setStreamThinking('')
        setError(err.message)
      }
    }

    await streamChat(messages, callbacks, abort.signal, thinkingEffort)
  }, [commitAssistantResponse])

  const handleSendMessage = useCallback(async (prompt?: string) => {
    const content = isFirstMessage
      ? (referenceText === userInput ? userInput : `${referenceText}\n\n${userInput}`.trim())
      : userInput.trim()

    if (!content) return

    let messages: ChatMessage[]
    // Capture current images before clearing
    const currentImages = [...attachedImages]
    if (prompt) {
      if (prompt === '__summary__') {
        messages = createSummaryMessages(content)
      } else if (prompt === '__explanation__') {
        messages = createExplanationMessages(content)
      } else {
        messages = createChatMessages(content, prompt, currentImages)
      }
    } else if (isFirstMessage) {
      messages = createChatMessages(content, undefined, currentImages)
    } else {
      messages = appendUserMessage(chatHistory, content, currentImages)
    }

    // Add user message to display list (for chat route, show the user's question)
    const displayContent = isFirstMessage
      ? content
      : userInput.trim()
    if (displayContent) {
      setDisplayMessages(prev => [...prev, { role: 'user', content: displayContent, images: currentImages.length > 0 ? currentImages : undefined }])
    }

    setIsLoading(true)
    setError(null)
    setStreamText('')
    setStreamThinking('')
    setUserInput('')
    setAttachedImages([])
    setIsFirstMessage(false)

    abortRef.current = new AbortController()

    const callbacks: StreamCallbacks = {
      onToken: (_token, fullText) => {
        setStreamText(fullText)
      },
      onThinkingToken: (_token, fullThinking) => {
        thinkingRef.current = fullThinking
        setStreamThinking(fullThinking)
      },
      onThinkingComplete: () => {
        // Keep thinking text visible until commitAssistantResponse saves it
      },
      onComplete: (fullText) => {
        commitAssistantResponse(messages, fullText)
      },
      onAbort: (fullText) => {
        commitAssistantResponse(messages, fullText)
      },
      onError: (err) => {
        abortRef.current = null
        setIsLoading(false)
        thinkingRef.current = ''
        setStreamThinking('')
        setError(err.message)
      }
    }

    await streamChat(messages, callbacks, abortRef.current.signal, thinkingEffort)
  }, [isFirstMessage, referenceText, userInput, chatHistory, commitAssistantResponse, attachedImages])

  const handlePause = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [])

  const handleTranslatePause = useCallback(() => {
    if (translateAbortRef.current) {
      translateAbortRef.current.abort()
    }
  }, [])

  const handleEsc = useCallback(() => {
    if (isLoading) {
      handlePause()
    } else if (isTranslateLoading) {
      handleTranslatePause()
    } else if (route === 'home') {
      window.api?.hideWindow()
    } else {
      setRoute('home')
      setUserInput('')
      setStreamText('')
      setChatHistory([])
      setDisplayMessages([])
      setError(null)
    }
  }, [handlePause, handleTranslatePause, isLoading, isTranslateLoading, route])

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) {
        return
      }

      event.preventDefault()
      handleEsc()
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleEsc])

  const handleCopy = useCallback(() => {
    // For translate view, copy translate result
    if (translateResult && route === 'translate') {
      navigator.clipboard.writeText(translateResult)
      return
    }
    // Copy the last assistant message or current stream
    const lastAssistant = [...displayMessages].reverse().find(m => m.role === 'assistant')
    const textToCopy = streamText || lastAssistant?.content || ''
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
    }
  }, [streamText, displayMessages, translateResult, route])

  const triggerFeature = useCallback((index: number) => {
    if (!referenceText && !userInput) return

    switch (index) {
      case 0:
        setRoute('chat')
        handleSendMessage()
        break
      case 1:
        setRoute('translate')
        break
      case 2:
        setRoute('summary')
        handleSendMessage('__summary__')
        break
      case 3:
        setRoute('explanation')
        handleSendMessage('__explanation__')
        break
    }
  }, [referenceText, userInput, handleSendMessage])

  const handleInputSubmit = useCallback(() => {
    if (isLoading) return
    if (route === 'home') {
      triggerFeature(selectedFeature)
    } else if (route === 'chat' || route === 'summary' || route === 'explanation') {
      handleSendMessage()
    }
  }, [route, isLoading, selectedFeature, handleSendMessage, triggerFeature])

  const handleArrowUp = useCallback(() => {
    setSelectedFeature((prev: number) => prev > 0 ? prev - 1 : 3)
  }, [])

  const handleArrowDown = useCallback(() => {
    setSelectedFeature((prev: number) => prev < 3 ? prev + 1 : 0)
  }, [])

  const handleBackspaceClear = useCallback(() => {
    if (clipboardText) clearClipboard()
  }, [clipboardText, clearClipboard])

  // ===== Render routes =====

  if (route === 'settings') {
    return (
      <div className="app-container">
        <SettingsView onBack={() => setRoute('home')} />
      </div>
    )
  }

  if (route === 'chat' || route === 'summary' || route === 'explanation') {
    return (
      <div className="app-container">
        {(route === 'chat' || route === 'summary' || route === 'explanation') && (
          <>
            <InputBar
              ref={inputRef}
              value={userInput}
              onChange={setUserInput}
              onSubmit={handleInputSubmit}
              placeholder="继续对话..."
              loading={isLoading}
              thinkingEffort={thinkingEffort}
              onThinkingEffortChange={handleThinkingEffortChange}
              images={attachedImages}
              onImagesChange={setAttachedImages}
            />
            <div className="divider" />
          </>
        )}
        {(route === 'summary' || route === 'explanation') && referenceText && (
          <div style={{ marginTop: 10, padding: '0 2px' }}>
            <ClipboardPreview text={referenceText} onClear={clearClipboard} />
          </div>
        )}
        <ChatView
          messages={displayMessages}
          streamingText={streamText}
          thinkingText={streamThinking}
          isLoading={isLoading}
          error={error}
        />
        <div className="divider" />
        <Footer
          route={route}
          loading={isLoading}
          isPinned={isPinned}
          onPinToggle={() => setIsPinned(!isPinned)}
          onEsc={handleEsc}
          onCopy={handleCopy}
          onSettings={() => setRoute('settings')}
        />
      </div>
    )
  }

  if (route === 'translate') {
    return (
      <div className="app-container">
        <TranslateView
          text={referenceText}
          onResultChange={setTranslateResult}
          onLoadingChange={setIsTranslateLoading}
          onAbortControllerChange={handleTranslateAbortControllerChange}
        />
        <div className="divider" />
        <Footer
          route={route}
          loading={isTranslateLoading}
          isPinned={isPinned}
          onPinToggle={() => setIsPinned(!isPinned)}
          onEsc={handleEsc}
          onCopy={handleCopy}
          onSettings={() => setRoute('settings')}
        />
      </div>
    )
  }

  // Home route
  return (
    <div className="app-container">
      <InputBar
        ref={inputRef}
        value={userInput}
        onChange={setUserInput}
        onSubmit={handleInputSubmit}
        placeholder={referenceText ? '输入补充内容，或按 Enter 使用功能...' : '输入问题或文本...'}
        loading={isLoading}
        isHome
        thinkingEffort={thinkingEffort}
        onThinkingEffortChange={handleThinkingEffortChange}
        onArrowUp={handleArrowUp}
        onArrowDown={handleArrowDown}
        onBackspaceClear={handleBackspaceClear}
        images={attachedImages}
        onImagesChange={setAttachedImages}
      />
      <div className="divider" />
      <ClipboardPreview text={clipboardText} onClear={clearClipboard} />
      <div className="feature-area">
        <FeatureMenu
          onSelect={(index: number) => {
            setSelectedFeature(index)
            triggerFeature(index)
          }}
          selectedIndex={selectedFeature}
        />
      </div>
      <div className="divider" />
      <Footer
        route={route}
        loading={isLoading}
        isPinned={isPinned}
        onPinToggle={() => setIsPinned(!isPinned)}
        onEsc={handleEsc}
        canClearClipboard={!!clipboardText && userInput.length === 0}
        onClearClipboard={clearClipboard}
        onSettings={() => setRoute('settings')}
      />
    </div>
  )
}
