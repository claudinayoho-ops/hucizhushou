import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, User, ChevronDown, ChevronRight, Brain } from 'lucide-react'
import Markdown from './Markdown'

/** A single message displayed in the chat */
export interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  images?: string[]
}

interface ChatViewProps {
  messages: DisplayMessage[]
  streamingText: string
  thinkingText?: string
  isLoading: boolean
  error: string | null
}

/** Claude sparkle icon for assistant avatar */
const ClaudeSparkle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4C33.2 19.6 44.4 30.8 60 32C44.4 33.2 33.2 44.4 32 60C30.8 44.4 19.6 33.2 4 32C19.6 30.8 30.8 19.6 32 4Z" fill="currentColor" />
  </svg>
)

/** Collapsible thinking block */
function ThinkingBlock({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  // Streaming blocks start expanded; finished/history blocks start collapsed
  const [expanded, setExpanded] = useState(isStreaming)

  return (
    <div className="thinking-block">
      <button
        className="thinking-block-header"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <Brain size={14} className={`thinking-block-icon ${isStreaming ? 'spinning-slow' : ''}`} />
        <span className="thinking-block-label">
          {isStreaming ? '思考中...' : '已完成思考'}
        </span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {expanded && (
        <div className="thinking-block-content">
          <Markdown content={text} />
        </div>
      )}
    </div>
  )
}

export default function ChatView({ messages, streamingText, thinkingText, isLoading, error }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottomRef = useRef(true)

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  const updateStickiness = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distanceToBottom = scrollHeight - clientHeight - scrollTop
    shouldStickToBottomRef.current = distanceToBottom <= 40
  }, [])

  // Auto-scroll only when the user is already near the bottom.
  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollToBottom()
    }
  }, [streamingText, thinkingText, messages.length, scrollToBottom])

  useEffect(() => {
    updateStickiness()
  }, [updateStickiness, isLoading])

  const hasContent = messages.length > 0 || streamingText || thinkingText

  return (
    <div className="chat-view" ref={scrollRef} onScroll={updateStickiness}>
      {/* Render all past messages */}
      {messages.map((msg, index) => (
        <div key={index}>
          {/* Saved thinking block for past assistant messages */}
          {msg.role === 'assistant' && msg.thinking && (
            <ThinkingBlock text={msg.thinking} isStreaming={false} />
          )}
          <div
            className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'} animate-fade-in`}
          >
            <div className="chat-message-avatar">
              {msg.role === 'user' ? <User size={14} /> : <ClaudeSparkle size={14} />}
            </div>
            <div className="chat-message-body">
              {msg.role === 'assistant' ? (
                <Markdown content={msg.content} />
              ) : (
                <>
                  {msg.images && msg.images.length > 0 && (
                    <div className="chat-message-images">
                      {msg.images.map((src, imgIdx) => (
                        <img key={imgIdx} src={src} alt={`图片 ${imgIdx + 1}`} className="chat-message-img" />
                      ))}
                    </div>
                  )}
                  <div className="chat-message-text">{msg.content}</div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Live thinking content (streaming) */}
      {thinkingText && (
        <ThinkingBlock text={thinkingText} isStreaming={true} />
      )}

      {/* Streaming response (current assistant reply) */}
      {streamingText && (
        <div className="chat-message chat-message-assistant animate-fade-in">
          <div className="chat-message-avatar">
            <ClaudeSparkle size={14} />
          </div>
          <div className="chat-message-body">
            <Markdown content={streamingText} />
          </div>
        </div>
      )}

      {/* Loading spinner when waiting for first token */}
      {!streamingText && !thinkingText && isLoading && (
        <div className="chat-loading animate-fade-in">
          <Loader2 size={18} className="spinning" />
          <span>正在思考...</span>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && !isLoading && !error && (
        <div className="chat-empty">
          <span>等待输出...</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="chat-error animate-fade-in">
          <span>⚠️ {error}</span>
        </div>
      )}
    </div>
  )
}
