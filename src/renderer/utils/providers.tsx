/**
 * Model provider detection and branded SVG icons.
 * Automatically identifies the provider from a model ID string
 * and returns the corresponding brand icon + color.
 */
// @ts-ignore (Vite handles these static asset imports)
import claudeUrl from '../assets/icons/claude-color.svg'
// @ts-ignore
import deepseekUrl from '../assets/icons/deepseek-color.svg'
// @ts-ignore
import geminiUrl from '../assets/icons/gemini-color.svg'
// @ts-ignore
import minimaxUrl from '../assets/icons/minimax-color.svg'
// @ts-ignore
import qwenUrl from '../assets/icons/qwen-color.svg'
// @ts-ignore
import kimiUrl from '../assets/icons/kimi.webp'

export interface ProviderInfo {
  id: string
  name: string
  color: string
}

/** Known provider patterns — order matters (first match wins). */
const PROVIDER_PATTERNS: Array<{ pattern: RegExp; provider: ProviderInfo }> = [
  { pattern: /deepseek/i,            provider: { id: 'deepseek',  name: 'DeepSeek',  color: '#4D6BFE' } },
  { pattern: /qwen|qwq/i,            provider: { id: 'qwen',      name: 'Qwen',      color: '#615EF0' } },
  { pattern: /glm|chatglm|zhipu/i,   provider: { id: 'zhipu',     name: '智谱',      color: '#3B68FF' } },
  { pattern: /kimi|moonshot/i,       provider: { id: 'kimi',      name: 'Kimi',      color: '#000000' } },
  { pattern: /gpt|o1|o3|o4/i,        provider: { id: 'openai',    name: 'OpenAI',    color: '#10A37F' } },
  { pattern: /claude/i,              provider: { id: 'claude',    name: 'Claude',    color: '#D97757' } },
  { pattern: /gemini|gemma/i,        provider: { id: 'gemini',    name: 'Gemini',    color: '#4285F4' } },
  { pattern: /minimax|abab/i,        provider: { id: 'minimax',   name: 'MiniMax',   color: '#E84E39' } },
  { pattern: /llama|meta/i,          provider: { id: 'meta',      name: 'Meta',      color: '#0668E1' } },
  { pattern: /mistral|mixtral/i,     provider: { id: 'mistral',   name: 'Mistral',   color: '#F7D046' } },
  { pattern: /yi-|^yi$/i,            provider: { id: 'yi',        name: '零一',      color: '#1E40AF' } },
  { pattern: /ernie|wenxin/i,        provider: { id: 'baidu',     name: '文心',      color: '#2932E1' } },
  { pattern: /hunyuan/i,             provider: { id: 'hunyuan',   name: '混元',      color: '#0052D9' } },
  { pattern: /doubao/i,              provider: { id: 'doubao',    name: '豆包',      color: '#3C82F7' } },
  { pattern: /spark|星火/i,           provider: { id: 'spark',     name: '星火',      color: '#0C6CF2' } },
]

const DEFAULT_PROVIDER: ProviderInfo = { id: 'default', name: 'AI', color: '#6366f1' }

/** Detect provider from model ID string */
export function detectProvider(modelId: string): ProviderInfo {
  if (!modelId) return DEFAULT_PROVIDER
  for (const { pattern, provider } of PROVIDER_PATTERNS) {
    if (pattern.test(modelId)) return provider
  }
  return DEFAULT_PROVIDER
}

// Inline SVGs for providers that need 'currentColor' mapping for dark mode (e.g. ZAI, OpenAI, Default)
const ZaiIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" />
  </svg>
)

const OpenAIIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  </svg>
)

const SparkIcon = ({ size, className, color }: { size: number; className?: string; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill={color} />
  </svg>
)

const DefaultIcon = ({ size, className, color }: { size: number; className?: string; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M32 4C33.2 19.6 44.4 30.8 60 32C44.4 33.2 33.2 44.4 32 60C30.8 44.4 19.6 33.2 4 32C19.6 30.8 30.8 19.6 32 4Z" fill={color} />
  </svg>
)

/** Render a provider icon SVG for a given model ID */
export function ProviderIcon({ modelId, size = 20, className = '' }: { modelId: string; size?: number; className?: string }) {
  const provider = detectProvider(modelId)
  
  if (provider.id === 'deepseek') return <img src={deepseekUrl} width={size} height={size} className={className} alt={provider.name} style={{ flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'qwen') return <img src={qwenUrl} width={size} height={size} className={className} alt={provider.name} style={{ flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'gemini') return <img src={geminiUrl} width={size} height={size} className={className} alt={provider.name} style={{ flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'claude') return <img src={claudeUrl} width={size} height={size} className={className} alt={provider.name} style={{ flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'minimax') return <img src={minimaxUrl} width={size} height={size} className={className} alt={provider.name} style={{ flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'kimi') return <img src={kimiUrl} width={size} height={size} className={className} alt={provider.name} style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'contain' }} />
  if (provider.id === 'zhipu') return <ZaiIcon size={size} className={className} />
  if (provider.id === 'openai') return <OpenAIIcon size={size} className={className} />
  if (provider.id === 'spark') return <SparkIcon size={size} className={className} color={provider.color} />

  return <DefaultIcon size={size} className={className} color={provider.color} />
}

/** Render a small avatar circle for a provider */
export function ProviderAvatar({ modelId, size = 24 }: { modelId: string; size?: number }) {
  const provider = detectProvider(modelId)
  const iconSize = Math.round(size * 0.6)

  return (
    <div
      className="provider-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${provider.color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      <ProviderIcon modelId={modelId} size={provider.id === 'kimi' ? size : iconSize} />
    </div>
  )
}
