import { useState, useEffect } from 'react'
import type { SlotAssignment, SkillReservationData } from '../../types/index'
import { ELEMENT_COLORS, ELEMENT_EMOJI } from '../../types/index'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  slots: SlotAssignment[]
  onChange: (slotNumber: number, skillQueue: SkillReservationData[]) => void
}

// ─── Reservation state ────────────────────────────────────────────────────────

interface SkillReservation {
  knightSlotNumber: number
  skillType: 'skill1' | 'skill2'
  order: 1 | 2 | 3
}

// ─── Skill card ───────────────────────────────────────────────────────────────

interface SkillCardProps {
  imgUrl?: string
  label: string
  reservation: SkillReservation | undefined
  totalReservations: number
  onClick: () => void
}

function SkillCard({ imgUrl, label, reservation, totalReservations, onClick }: SkillCardProps) {
  const [hovered, setHovered] = useState(false)

  const isReserved  = reservation !== undefined
  const isFull      = !isReserved && totalReservations >= 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <span style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.02em' }}>{label}</span>

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        style={{
          width: '90px',
          height: '90px',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          cursor: isFull ? 'not-allowed' : 'pointer',
          border: hovered && !isFull
            ? '2px solid #f59e0b'
            : isReserved
            ? '2px solid #f59e0b88'
            : imgUrl
            ? '2px solid #1f2937'
            : '2px dashed #374151',
          background: imgUrl ? '#0a0c14' : '#1f2937',
          transition: 'border-color 0.15s',
          flexShrink: 0,
        }}
      >
        {/* Skill image */}
        {imgUrl && (
          <img
            src={imgUrl}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* No image placeholder */}
        {!imgUrl && !isReserved && !isFull && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', color: '#4b5563',
          }}>
            ?
          </div>
        )}

        {/* RESERVED overlay */}
        {isReserved && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {reservation.order}
            </div>
            <span style={{ fontSize: '10px', color: '#fff', marginTop: '4px' }}>
              จองลำดับที่ {reservation.order}
            </span>
          </div>
        )}

        {/* HOVER ADD overlay (not reserved, not full) */}
        {!isReserved && !isFull && hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(245,158,11,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 'bold', color: '#f59e0b',
          }}>
            ＋ จอง
          </div>
        )}

        {/* FULL overlay (not reserved, max reached) */}
        {isFull && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10px', color: '#6b7280',
          }}>
            ครบแล้ว
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SkillQueueStep({ slots, onChange }: Props) {
  const [reservations, setReservations] = useState<SkillReservation[]>([])

  const assignedSlots = slots.filter(s => s.knight !== null)

  // ── Sync reservations → parent onChange ──────────────────────────────────
  useEffect(() => {
    // Group reservations by slot, preserving global order
    const skillQueues: Record<number, SkillReservationData[]> = {}
    const sorted = [...reservations].sort((a, b) => a.order - b.order)
    sorted.forEach(r => {
      if (!skillQueues[r.knightSlotNumber]) skillQueues[r.knightSlotNumber] = []
      skillQueues[r.knightSlotNumber].push({ skillType: r.skillType, globalOrder: r.order })
    })

    // Clear any slots that lost all reservations
    assignedSlots.forEach(s => {
      if (!skillQueues[s.slotNumber]) {
        onChange(s.slotNumber, [])
      }
    })

    Object.entries(skillQueues).forEach(([slotNum, queue]) => {
      onChange(Number(slotNum), queue)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations])

  // ── Click handler ─────────────────────────────────────────────────────────
  function handleSkillClick(slotNumber: number, skillType: 'skill1' | 'skill2') {
    const existing = reservations.find(
      r => r.knightSlotNumber === slotNumber && r.skillType === skillType
    )

    if (existing) {
      // Unreserve: remove and re-number remaining
      const updated = reservations
        .filter(r => !(r.knightSlotNumber === slotNumber && r.skillType === skillType))
        .sort((a, b) => a.order - b.order)
        .map((r, i) => ({ ...r, order: (i + 1) as 1 | 2 | 3 }))
      setReservations(updated)
      return
    }

    if (reservations.length >= 3) return

    const nextOrder = (reservations.length + 1) as 1 | 2 | 3
    setReservations(prev => [...prev, { knightSlotNumber: slotNumber, skillType, order: nextOrder }])
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleResetAll() {
    setReservations([])
  }

  const sortedReservations = [...reservations].sort((a, b) => a.order - b.order)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Title row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>⭐ Skill Queue</span>
        <button
          onClick={handleResetAll}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: 'transparent',
            color: '#6b7280',
            border: '1px solid #374151',
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#9ca3af' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#6b7280' }}
        >
          Reset
        </button>
      </div>

      {/* ── Knight blocks ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1a1f35',
        borderRadius: '12px',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'row',
        gap: '0',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowX: 'auto',
      }}>
        {assignedSlots.map((slot, idx) => {
          const knight = slot.knight!
          const color  = ELEMENT_COLORS[knight.element]

          const res1 = reservations.find(r => r.knightSlotNumber === slot.slotNumber && r.skillType === 'skill1')
          const res2 = reservations.find(r => r.knightSlotNumber === slot.slotNumber && r.skillType === 'skill2')

          return (
            <div key={slot.slotNumber} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              {/* Connector between blocks */}
              {idx > 0 && (
                <div style={{
                  width: '24px',
                  height: '2px',
                  background: 'linear-gradient(to right, #374151, #f59e0b44, #374151)',
                  flexShrink: 0,
                  alignSelf: 'center',
                  marginBottom: '8px',
                }} />
              )}

              {/* Knight block */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                width: '120px',
              }}>

                {/* Portrait */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `3px solid ${color}`,
                  boxShadow: `0 0 10px ${color}55`,
                  position: 'relative',
                  flexShrink: 0,
                  background: knight.image_url ? '#0a0c14' : color + '33',
                }}>
                  {knight.image_url ? (
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
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '36px', fontWeight: 'bold', color,
                    }}>
                      {knight.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Knight name + element */}
                <div style={{ textAlign: 'center', lineHeight: 1.4 }}>
                  <p style={{ fontSize: '11px', color: '#fff', margin: 0, fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {knight.name}
                  </p>
                  <p style={{ fontSize: '10px', margin: 0, marginTop: '1px' }}>
                    {ELEMENT_EMOJI[knight.element]}
                  </p>
                </div>

                {/* Skill 2 card */}
                <SkillCard
                  imgUrl={knight.img_skill_2}
                  label="Skill 2"
                  reservation={res2}
                  totalReservations={reservations.length}
                  onClick={() => handleSkillClick(slot.slotNumber, 'skill2')}
                />

                {/* Skill 1 card */}
                <SkillCard
                  imgUrl={knight.img_skill_1}
                  label="Skill 1"
                  reservation={res1}
                  totalReservations={reservations.length}
                  onClick={() => handleSkillClick(slot.slotNumber, 'skill1')}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Queue summary bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', flexShrink: 0 }}>
          Skill Queue:
        </span>

        {[1, 2, 3].map(order => {
          const res = sortedReservations.find(r => r.order === order)
          const slot = res ? assignedSlots.find(s => s.slotNumber === res.knightSlotNumber) : null

          if (res && slot?.knight) {
            const imgUrl = res.skillType === 'skill1' ? slot.knight.img_skill_1
                         : slot.knight.img_skill_2
            return (
              <div key={order} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Order circle */}
                <div style={{
                  width: '20px', height: '20px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {order}
                </div>
                {/* Skill image */}
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={res.skillType}
                    style={{ width: '20px', height: '20px', borderRadius: '3px', objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <span style={{ fontSize: '10px', color: '#e2e8f0', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  จองลำดับที่ {order}
                </span>
              </div>
            )
          }

          return (
            <div key={order} style={{
              width: '60px',
              height: '24px',
              border: '1px dashed #374151',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#374151',
            }}>
              —
            </div>
          )
        })}
      </div>
    </div>
  )
}
