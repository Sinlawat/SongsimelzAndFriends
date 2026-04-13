import { useEffect, useRef } from 'react'
import type { Item, SlotType } from '../types/index'
import { getStatLabel } from '../hooks/useStatCalculator'
import GradeBadge, { GRADE_META_MAP } from './GradeBadge'

interface Props {
  slotType: SlotType
  items: Item[]
  currentItem: Item | null
  onEquip: (item: Item) => void
  onUnequip: () => void
  onClose: () => void
}

const SLOT_ICONS: Record<SlotType, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  gem: '💎',
}

// Use shared grade meta from GradeBadge
const GRADE_STYLES = GRADE_META_MAP

export default function ItemModal({ slotType, items, currentItem, onEquip, onUnequip, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: '#111827', borderColor: '#1e293b' }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: '#1e293b' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{SLOT_ICONS[slotType]}</span>
            <h2 className="font-bold tracking-widest uppercase text-sm" style={{ color: '#f59e0b' }}>
              Select {slotType.charAt(0).toUpperCase() + slotType.slice(1)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 transition-colors hover:text-white"
            style={{ backgroundColor: '#1e293b' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable item list */}
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2">
          {/* Unequip option */}
          <button
            onClick={onUnequip}
            className="w-full text-left rounded-lg border px-4 py-3 transition-all"
            style={{ backgroundColor: '#0d1117', borderColor: '#1e293b', color: '#6b7280' }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#374151'
              e.currentTarget.style.color = '#9ca3af'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1e293b'
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">⬜</span>
              <span className="text-sm font-medium">Unequip (Empty Slot)</span>
            </div>
          </button>

          {items.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-6">No items available for this slot.</p>
          )}

          {items.map(item => {
            const g = GRADE_STYLES[item.grade]
            const isEquipped = currentItem?.id === item.id

            return (
              <button
                key={item.id}
                onClick={() => onEquip(item)}
                className="w-full text-left rounded-lg border px-4 py-3 transition-all"
                style={{
                  backgroundColor: isEquipped ? g.bg : '#0d1117',
                  borderColor: isEquipped ? g.color : g.border,
                  boxShadow: isEquipped ? `0 0 12px ${g.color}33` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isEquipped) {
                    e.currentTarget.style.borderColor = g.color
                    e.currentTarget.style.backgroundColor = g.bg
                  }
                }}
                onMouseLeave={e => {
                  if (!isEquipped) {
                    e.currentTarget.style.borderColor = g.border
                    e.currentTarget.style.backgroundColor = '#0d1117'
                  }
                }}
              >
                {/* Item name row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: g.color }}>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isEquipped && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                        Equipped
                      </span>
                    )}
                    <GradeBadge grade={item.grade} />
                  </div>
                </div>

                {/* Stat bonuses */}
                {item.item_stat_bonuses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.item_stat_bonuses.map(bonus => (
                      <span
                        key={bonus.id}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }}
                      >
                        +{bonus.value}{bonus.bonus_type === 'percent' ? '%' : ''}{' '}
                        {getStatLabel(bonus.stat_name)}{' '}
                        <span style={{ color: '#16a34a', fontSize: '0.65rem' }}>
                          ({bonus.bonus_type})
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No stat bonuses</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
