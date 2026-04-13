import type { Item } from '../types/index'

interface Props {
  grade: Item['grade']
  size?: 'sm' | 'md'
}

const GRADE_META: Record<Item['grade'], { color: string; bg: string; border: string; label: string }> = {
  normal:    { color: '#9ca3af', bg: '#9ca3af15', border: '#9ca3af35', label: 'Normal' },
  rare:      { color: '#3b82f6', bg: '#3b82f615', border: '#3b82f635', label: 'Rare' },
  epic:      { color: '#a855f7', bg: '#a855f715', border: '#a855f735', label: 'Epic' },
  legendary: { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b35', label: 'Legendary' },
}

export default function GradeBadge({ grade, size = 'sm' }: Props) {
  const meta = GRADE_META[grade]
  const padding = size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`${padding} rounded-full font-bold tracking-wide inline-block flex-shrink-0`}
      style={{
        color: meta.color,
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
        textShadow: grade === 'legendary' ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
      }}
    >
      {meta.label}
    </span>
  )
}

// Export meta for other components that need the raw color values
export const GRADE_META_MAP: Record<Item['grade'], { color: string; bg: string; border: string; label: string }> = {
  normal:    { color: '#9ca3af', bg: '#9ca3af15', border: '#9ca3af35', label: 'Normal' },
  rare:      { color: '#3b82f6', bg: '#3b82f615', border: '#3b82f635', label: 'Rare' },
  epic:      { color: '#a855f7', bg: '#a855f715', border: '#a855f735', label: 'Epic' },
  legendary: { color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b35', label: 'Legendary' },
}
