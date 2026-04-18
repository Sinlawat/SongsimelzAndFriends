import { useState } from 'react'
import type { ParsedEquipmentItem, EquipmentSlotType } from '../types/index'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  items: ParsedEquipmentItem[]
  assignedItems: Record<EquipmentSlotType, ParsedEquipmentItem | null>
  onAssign: (slotType: EquipmentSlotType, item: ParsedEquipmentItem | null) => void
  onOptimize?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'weapon' | 'armor' | 'ring' | 'unknown'

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'weapon',  label: 'Weapon'  },
  { key: 'armor',   label: 'Armor'   },
  { key: 'ring',    label: 'Ring'    },
  { key: 'unknown', label: 'Unknown' },
]

const SLOT_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  weapon:  { bg: '#7f1d1d', color: '#fca5a5' },
  armor:   { bg: '#1e3a5f', color: '#93c5fd' },
  ring:    { bg: '#2d1b69', color: '#c4b5fd' },
  unknown: { bg: '#1f2937', color: '#6b7280' },
}

const STAT_DISPLAY: Record<string, string> = {
  base_hp:                     'HP',
  base_defense:                'Defense',
  base_attack_physical:        'ATK (Phy)',
  base_attack_magic:           'ATK (Mag)',
  all_attack:                  'All ATK',
  base_crit_rate:              'Crit Rate',
  base_crit_damage:            'Crit DMG',
  base_speed:                  'Speed',
  base_weakness:               'Weakness',
  base_damage_taken_reduction: 'DMG Taken -',
  base_block_rate:             'Block Rate',
  base_resistance:             'Resistance',
  base_effective_hit_rate:     'Eff. Hit',
}

// Slots to show per item slot_type
const SLOTS_FOR_TYPE: Record<string, EquipmentSlotType[]> = {
  weapon:  ['weapon1', 'weapon2'],
  armor:   ['armor1', 'armor2'],
  ring:    ['ring'],
  unknown: ['weapon1', 'weapon2', 'armor1', 'armor2', 'ring'],
}

const SLOT_LABEL: Record<EquipmentSlotType, string> = {
  weapon1: 'W1',
  weapon2: 'W2',
  armor1:  'A1',
  armor2:  'A2',
  ring:    'Ring',
}

// ─── Item card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  assignedItems,
  onAssign,
}: {
  item: ParsedEquipmentItem
  assignedItems: Record<EquipmentSlotType, ParsedEquipmentItem | null>
  onAssign: (slotType: EquipmentSlotType, item: ParsedEquipmentItem | null) => void
}) {
  const [showSubs, setShowSubs] = useState(false)

  const slotColor = SLOT_TYPE_COLOR[item.slot_type] ?? SLOT_TYPE_COLOR.unknown
  const slotsToShow = SLOTS_FOR_TYPE[item.slot_type] ?? SLOTS_FOR_TYPE.unknown

  // Is this item assigned to any slot?
  const assignedSlot = (Object.entries(assignedItems) as [EquipmentSlotType, ParsedEquipmentItem | null][])
    .find(([, assigned]) => assigned?.run_no === item.run_no)?.[0] ?? null

  const isAssigned = assignedSlot !== null

  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${isAssigned ? '#f59e0b' : '#1e293b'}`,
      borderRadius: '10px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      transition: 'border-color 0.15s',
    }}>
      {/* Top row: slot type badge + set name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase',
          letterSpacing: '0.06em', padding: '2px 7px', borderRadius: '20px',
          background: slotColor.bg, color: slotColor.color,
        }}>
          {item.slot_type}
        </span>
        {item.set_name && (
          <span style={{
            fontSize: '9px', padding: '2px 6px', borderRadius: '20px',
            background: '#1c1a05', color: '#f59e0b',
            border: '1px solid #f59e0b44',
            maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.set_name}
          </span>
        )}
      </div>

      {/* Item name */}
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </div>

      {/* Upgrade level */}
      <div style={{ fontSize: '10px', color: '#6b7280' }}>
        +{item.upgrade_level}
      </div>

      {/* Main stats */}
      {item.main_stats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {item.main_stats.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                {STAT_DISPLAY[s.stat_name] ?? s.stat_name}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: s.is_percent ? '#f59e0b' : '#e2e8f0' }}>
                {s.display}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sub stats toggle */}
      {item.sub_stats.length > 0 && (
        <>
          <button
            onClick={() => setShowSubs(p => !p)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              textAlign: 'left', fontSize: '10px', color: '#4b5563',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
          >
            <span style={{ transition: 'transform 0.15s', display: 'inline-block', transform: showSubs ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
            Sub stats ({item.sub_stats.length})
          </button>

          {showSubs && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '3px',
              paddingLeft: '8px', borderLeft: '2px solid #1e293b',
            }}>
              {item.sub_stats.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#6b7280' }}>
                    {STAT_DISPLAY[s.stat_name] ?? s.stat_name}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: s.is_percent ? '#f59e0b' : '#d1d5db' }}>
                    {s.display}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Assign slot buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
        {slotsToShow.map(slotType => {
          const slotOwner = assignedItems[slotType]
          const isThisItemHere = slotOwner?.run_no === item.run_no
          const isTakenByOther = slotOwner !== null && !isThisItemHere

          return (
            <button
              key={slotType}
              onClick={() => onAssign(slotType, isThisItemHere ? null : item)}
              title={isThisItemHere ? `Unassign from ${slotType}` : `Assign to ${slotType}`}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: isTakenByOther ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                border: isThisItemHere
                  ? '1.5px solid #f59e0b'
                  : isTakenByOther
                  ? '1.5px solid #1f2937'
                  : '1.5px solid #374151',
                background: isThisItemHere
                  ? '#78350f'
                  : isTakenByOther
                  ? '#111827'
                  : '#1f2937',
                color: isThisItemHere
                  ? '#fbbf24'
                  : isTakenByOther
                  ? '#374151'
                  : '#9ca3af',
                textDecoration: isTakenByOther ? 'line-through' : 'none',
              }}
            >
              {isThisItemHere ? `✓ ${SLOT_LABEL[slotType]}` : SLOT_LABEL[slotType]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportedEquipmentList({ items, assignedItems, onAssign, onOptimize }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const counts: Record<FilterType, number> = {
    all:     items.length,
    weapon:  items.filter(i => i.slot_type === 'weapon').length,
    armor:   items.filter(i => i.slot_type === 'armor').length,
    ring:    items.filter(i => i.slot_type === 'ring').length,
    unknown: items.filter(i => i.slot_type === 'unknown').length,
  }

  const filtered = items.filter(item => {
    const matchesFilter = filter === 'all' || item.slot_type === filter
    const matchesSearch = search.trim() === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.set_name ?? '').toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search */}
      <input
        type="text"
        placeholder="ค้นหาชื่อหรือ Set..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '13px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#1e293b' }}
      />

      {/* Optimize button */}
      {onOptimize && (
        <button
          onClick={onOptimize}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            border: 'none',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          ✨ จัดอุปกรณ์อัตโนมัติ
        </button>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => {
          const active = filter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: active ? '1.5px solid #f59e0b' : '1.5px solid #1e293b',
                background: active ? '#1c1a05' : '#0f172a',
                color: active ? '#f59e0b' : '#6b7280',
              }}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          )
        })}
      </div>

      {/* Item grid */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '24px 0' }}>
          ไม่พบอุปกรณ์
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
        }}>
          {filtered.map(item => (
            <ItemCard
              key={`${item.run_no}-${item.name}-${item.slot_type}`}
              item={item}
              assignedItems={assignedItems}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}
