import { CircleArrowLeft, Copy, Pin, Settings } from 'lucide-react'

interface FooterProps {
  route: string
  loading: boolean
  isPinned: boolean
  onPinToggle: () => void
  onEsc: () => void
  onCopy?: () => void
  canClearClipboard?: boolean
  onClearClipboard?: () => void
  onSettings: () => void
}

export default function Footer({
  route,
  loading,
  isPinned,
  onPinToggle,
  onEsc,
  onCopy,
  canClearClipboard,
  onClearClipboard,
  onSettings
}: FooterProps) {
  const escLabel = loading
    ? '暂停'
    : route === 'home'
    ? '关闭'
    : '返回'

  return (
    <div className="footer">
      <div className="footer-left">
        <button className="footer-tag" onClick={onEsc}>
          <CircleArrowLeft size={13} />
          <span>Esc {escLabel}</span>
        </button>

        {route === 'home' && canClearClipboard && (
          <button className="footer-tag" onClick={onClearClipboard}>
            <span>⌫ 清除</span>
          </button>
        )}

        {route !== 'home' && !loading && onCopy && (
          <button className="footer-tag" onClick={onCopy}>
            <Copy size={13} />
            <span>复制</span>
          </button>
        )}
      </div>

      <div className="footer-right">
        <button className="footer-icon-btn" onClick={onSettings} title="设置">
          <Settings size={14} />
        </button>
        <button
          className="footer-icon-btn"
          onClick={onPinToggle}
          title={isPinned ? '取消固定' : '固定窗口'}
        >
          <Pin
            size={14}
            style={{
              color: isPinned ? 'var(--accent)' : 'var(--text-secondary)',
              transform: isPinned ? 'rotate(45deg)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          />
        </button>
      </div>
    </div>
  )
}
