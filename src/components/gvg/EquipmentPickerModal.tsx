import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Equipment, EquipmentSlotType } from '../../types/index'
import { EQUIPMENT_SLOTS } from '../../types/index'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  slotType: EquipmentSlotType
  onSelect: (equipment: Equipment | null) => void
  currentEquipmentId?: string | null
}

// ─── Empty slot card ──────────────────────────────────────────────────────────

function EmptyCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '100px',
        borderRadius: '10px',
        background: '#1f2937',
        border: `1.5px dashed ${hovered ? '#ef4444' : '#374151'}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'border-color 0.15s',
        padding: 0,
      }}
    >
      <span style={{ fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>✕</span>
      <span style={{ fontSize: '10px', color: '#6b7280' }}>ไม่ใส่</span>
    </button>
  )
}

// ─── Equipment card ───────────────────────────────────────────────────────────

const EQUIP_ICON: Record<string, string> = {
  weapon: '⚔️',
  armor:  '🛡️',
  ring:   '💍',
}

function EquipCard({
  equipment,
  equipType,
  isSelected,
  onClick,
}: {
  equipment: Equipment
  equipType: 'weapon' | 'armor' | 'ring'
  isSelected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '100px',
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1f2937',
        border: isSelected
          ? '2px solid #f59e0b'
          : `1.5px solid ${hovered ? '#f59e0b' : '#374151'}`,
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'border-color 0.15s, transform 0.15s',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image area — 72px tall */}
      <div style={{ height: '72px', width: '100%', position: 'relative', flexShrink: 0 }}>
        {equipment.image_url ? (
          <img
            src={equipment.image_url}
            alt={equipment.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#1a2744',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}>
            {EQUIP_ICON[equipType]}
          </div>
        )}
      </div>

      {/* Set name accent bar */}
      <div style={{ height: '3px', background: '#f59e0b33', flexShrink: 0 }} />

      {/* Bottom label — 25px tall */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 6px',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: '9px',
          color: '#fff',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}>
          {equipment.name}
        </div>
        {equipment.set_name && (
          <div style={{
            fontSize: '8px',
            color: '#f59e0b99',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
          }}>
            {equipment.set_name}
          </div>
        )}
      </div>

      {/* Selected badge */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#f59e0b',
          color: '#000',
          fontSize: '9px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          ✓
        </div>
      )}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EquipmentPickerModal({
  isOpen,
  onClose,
  slotType,
  onSelect,
  currentEquipmentId,
}: Props) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [search,        setSearch]        = useState('')
  const [setFilter,     setSetFilter]     = useState<string | null>(null)

  const equipType = EQUIPMENT_SLOTS.find(s => s.type === slotType)?.equipType ?? 'weapon'
  const slotLabel = EQUIPMENT_SLOTS.find(s => s.type === slotType)?.label ?? ''

  useEffect(() => {
    if (!isOpen) return
    setSearch('')
    setSetFilter(null)
    supabase
      .from('equipment')
      .select('*')
      .eq('slot_type', equipType)
      .order('set_name')
      .then(({ data }) => setEquipmentList(data ?? []))
  }, [isOpen, slotType]) // eslint-disable-line react-hooks/exhaustive-deps

  const sets = [...new Set(equipmentList.map(e => e.set_name).filter(Boolean))] as string[]

  const filtered = equipmentList.filter(eq => {
    const matchSearch = eq.name.toLowerCase().includes(search.toLowerCase())
    const matchSet    = setFilter === null || eq.set_name === setFilter
    return matchSearch && matchSet
  })

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '520px',
          background: '#111827',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '40px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={{
          background: '#1e3a5f',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
            {slotLabel} — เลือกอุปกรณ์
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#1e293b',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#1e293b' }}
          >
            ✕
          </button>
        </div>

        {/* ── Search ───────────────────────────────────────────────────────── */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e293b' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่ออุปกรณ์..."
            style={{
              width: '100%',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#e2e8f0',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e  => { e.currentTarget.style.borderColor = '#f59e0b' }}
            onBlur={e   => { e.currentTarget.style.borderColor = '#374151' }}
          />
        </div>

        {/* ── Set filter row ────────────────────────────────────────────────── */}
        {sets.length > 0 && (
          <div style={{
            padding: '8px 16px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b',
          }}>
            <span style={{ fontSize: '11px', color: '#f59e0b', marginRight: '2px' }}>Set:</span>

            {sets.map(set => (
              <button
                key={set}
                onClick={() => setSetFilter(setFilter === set ? null : set)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: setFilter === set ? '1.5px solid #f59e0b' : '1.5px solid #374151',
                  background: setFilter === set ? '#1e3a5f' : 'transparent',
                  color: setFilter === set ? '#f59e0b' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {set}
              </button>
            ))}

            {setFilter !== null && (
              <button
                onClick={() => setSetFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 4px',
                }}
              >
                รีเซ็ต
              </button>
            )}
          </div>
        )}

        {/* ── Equipment grid ────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '8px',
          padding: '12px',
          maxHeight: '55vh',
          overflowY: 'auto',
        }}>
          {/* "No equipment" card */}
          <EmptyCard onClick={() => { onSelect(null); onClose() }} />

          {filtered.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '32px',
              color: '#4b5563',
              fontSize: '13px',
            }}>
              ไม่พบอุปกรณ์
            </div>
          ) : (
            filtered.map(eq => (
              <EquipCard
                key={eq.id}
                equipment={eq}
                equipType={equipType}
                isSelected={currentEquipmentId === eq.id}
                onClick={() => { onSelect(eq); onClose() }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
