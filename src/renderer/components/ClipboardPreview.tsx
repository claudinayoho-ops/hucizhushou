import { X, ClipboardCopy } from 'lucide-react'

interface ClipboardPreviewProps {
  text: string
  onClear: () => void
}

export default function ClipboardPreview({ text, onClear }: ClipboardPreviewProps) {
  if (!text) return null

  return (
    <div className="clipboard-preview animate-fade-in">
      <ClipboardCopy size={14} className="clipboard-icon" />
      <p className="clipboard-text">{text}</p>
      <button className="clipboard-close no-drag" onClick={onClear} title="清除">
        <X size={14} />
      </button>
    </div>
  )
}
