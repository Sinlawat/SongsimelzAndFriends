import type { Knight } from '../../types/index'
import { ELEMENT_COLORS, ELEMENT_ICONS } from '../../types/index'

interface Props {
  knight: Knight
  size?: number
  showName?: boolean
}

export default function KnightAvatar({ knight, size = 48, showName = false }: Props) {
  const color  = ELEMENT_COLORS[knight.element] ?? '#9ca3af'
  const radius = Math.round(size * 0.167)   // ~8px at size 48
  const badge  = Math.max(14, Math.round(size * 0.35))  // badge circle size
  const emoji  = Math.max(8,  Math.round(size * 0.18))  // emoji font-size

  return (
    <div className="flex flex-col items-center" style={{ gap: 4, flexShrink: 0 }}>
      {/* Portrait */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {knight.image_url ? (
          <div style={{
            width: size,
            height: size,
            borderRadius: radius,
            overflow: 'hidden',
            position: 'relative',
            background: '#0a0c14',
            border: `2px solid ${color}44`,
            flexShrink: 0,
          }}>
            <img
              src={knight.image_url}
              alt={knight.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
              onError={e => {
                const wrapper = e.currentTarget.parentElement
                if (wrapper) wrapper.style.display = 'none'
                const fallback = wrapper?.parentElement?.querySelector('.avatar-fallback') as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            {/* Element glow border overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: radius - 2,
              boxShadow: `inset 0 0 0 2px ${color}66`,
              pointerEvents: 'none',
            }} />
          </div>
        ) : null}

        {/* Fallback initial circle — always in DOM, hidden when image loads */}
        <div
          className="avatar-fallback w-full h-full flex items-center justify-center font-black select-none"
          style={{
            display: knight.image_url ? 'none' : 'flex',
            borderRadius: radius,
            backgroundColor: `${color}33`,
            border: `2px solid ${color}`,
            color,
            fontSize: Math.round(size * 0.38),
          }}
        >
          {knight.name.charAt(0).toUpperCase()}
        </div>

        {/* Element emoji badge — bottom-right corner */}
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            width: badge,
            height: badge,
            bottom: -2,
            right: -2,
            borderRadius: '50%',
            backgroundColor: '#0d1117',
            border: `1px solid ${color}50`,
            lineHeight: 1,
          }}
        >
          <img
            src={ELEMENT_ICONS[knight.element]}
            alt={knight.element}
            style={{ width: emoji, height: emoji, objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Name label */}
      {showName && (
        <span
          className="text-center leading-tight"
          style={{
            fontSize: Math.max(9, Math.round(size * 0.19)),
            color: '#9ca3af',
            maxWidth: size + 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {knight.name}
        </span>
      )}
    </div>
  )
}
