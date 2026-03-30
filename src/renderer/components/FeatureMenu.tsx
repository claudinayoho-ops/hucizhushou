import { MessageSquare, Languages, FileText, Lightbulb, CornerDownLeft } from 'lucide-react'

interface FeatureMenuProps {
  onSelect: (index: number) => void
  selectedIndex: number
}

const features = [
  { icon: MessageSquare, label: '回答此问题', color: '#6366f1' },
  { icon: Languages, label: '文本翻译', color: '#06b6d4' },
  { icon: FileText, label: '内容总结', color: '#f59e0b' },
  { icon: Lightbulb, label: '解释说明', color: '#22c55e' }
]

export default function FeatureMenu({ onSelect, selectedIndex }: FeatureMenuProps) {
  return (
    <div className="feature-menu">
      {features.map((feature, index) => {
        const Icon = feature.icon
        const isActive = index === selectedIndex
        return (
          <div
            key={index}
            className={`feature-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(index)}
            onMouseEnter={() => {}} // keep hover visual only
          >
            <div className="feature-icon" style={{ color: feature.color }}>
              <Icon size={17} />
            </div>
            <span className="feature-label">{feature.label}</span>
            {isActive && (
              <div className="feature-enter">
                <CornerDownLeft size={13} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
