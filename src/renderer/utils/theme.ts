export type ThemeMode = 'system' | 'light' | 'dark'
export type ThemeColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'ocean'

export interface ThemeColorOption {
  value: ThemeColor
  label: string
  description: string
  swatches: [string, string, string]
}

export const themeColorOptions: ThemeColorOption[] = [
  {
    value: 'indigo',
    label: '极夜靛蓝',
    description: '冷静、克制，适合默认工作流。',
    swatches: ['#6366f1', '#8b5cf6', '#a5b4fc']
  },
  {
    value: 'emerald',
    label: '松石绿洲',
    description: '清爽偏专业，适合长时间阅读。',
    swatches: ['#10b981', '#14b8a6', '#6ee7b7']
  },
  {
    value: 'amber',
    label: '琥珀暖光',
    description: '更有温度，适合翻译与总结视图。',
    swatches: ['#f59e0b', '#f97316', '#fcd34d']
  },
  {
    value: 'rose',
    label: '暮色蔷薇',
    description: '层次更强，强调重点更明显。',
    swatches: ['#f43f5e', '#ec4899', '#f9a8d4']
  },
  {
    value: 'ocean',
    label: '深海蓝青',
    description: '科技感更强，适合问答场景。',
    swatches: ['#0ea5e9', '#06b6d4', '#67e8f9']
  }
]

export function applyThemePreferences(theme: string, colorTheme?: string): void {
  const root = document.documentElement

  root.classList.remove('theme-dark', 'theme-light')

  if (theme === 'dark') {
    root.classList.add('theme-dark')
  } else if (theme === 'light') {
    root.classList.add('theme-light')
  }

  root.dataset.colorTheme = colorTheme || 'indigo'
}