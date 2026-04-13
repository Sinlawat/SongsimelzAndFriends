import type { EquippedItems, SlotType, Item } from '../types/index'

interface Props {
  equippedItems: EquippedItems
  onOpenModal: (slot: SlotType) => void
}

const SLOTS: { type: SlotType; label: string; icon: string }[] = [
  { type: 'weapon',    label: 'Weapon',    icon: '⚔️' },
  { type: 'armor',     label: 'Armor',     icon: '🛡️' },
  { type: 'accessory', label: 'Accessory', icon: '💍' },
  { type: 'gem',       label: 'Gem',       icon: '💎' },
]

const GRADE_STYLES: Record<Item['grade'], { color: string; bg: string; label: string }> = {
  normal:    { color: '#9ca3af', bg: '#9ca3af18', label: 'Normal' },
  rare:      { color: '#3b82f6', bg: '#3b82f618', label: 'Rare' },
  epic:      { color: '#a855f7', bg: '#a855f718', label: 'Epic' },
  legendary: { color: '#f59e0b', bg: '#f59e0b18', label: 'Legendary' },
}

export default function EquipmentSlots({ equippedItems, onOpenModal }: Props) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-5"
      style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
    >
      {/* Panel title */}
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: '#1e293b' }}>
        <span className="text-lg">🎒</span>
        <h2 className="font-bold tracking-widest uppercase text-sm" style={{ color: '#f59e0b' }}>
          Equipment
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {SLOTS.map(slot => {
          const item = equippedItems[slot.type]
          const gradeStyle = item ? GRADE_STYLES[item.grade] : null

          return (
            <div
              key={slot.type}
              className="rounded-lg border p-3 flex items-center gap-3"
              style={{
                backgroundColor: '#0d1117',
                borderColor: item ? (gradeStyle?.color ?? '#1e293b') : '#1e293b',
                boxShadow: item ? `0 0 12px ${gradeStyle?.color}22` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {/* Slot icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border"
                style={{
                  backgroundColor: item ? gradeStyle?.bg : '#111827',
                  borderColor: item ? gradeStyle?.color : '#1e293b',
                }}
              >
                {slot.icon}
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{slot.label}</p>
                {item ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ color: gradeStyle?.color }}
                    >
                      {item.name}
                    </p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                      style={{
                        color: gradeStyle?.color,
                        backgroundColor: gradeStyle?.bg,
                      }}
                    >
                      {gradeStyle?.label}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-0.5">Empty</p>
                )}
              </div>

              {/* Equip button */}
              <button
                onClick={() => onOpenModal(slot.type)}
                className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: '#1d3a5f',
                  color: '#3b82f6',
                  border: '1px solid #2563eb44',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#1d3a5f'
                  e.currentTarget.style.color = '#3b82f6'
                }}
              >
                {item ? 'Change' : 'Equip'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
