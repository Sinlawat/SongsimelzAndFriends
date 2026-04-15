import { useState } from 'react'
import type { Formation, SlotAssignment, Knight, SkillReservationData } from '../../types/index'
import { SKILL_OPTIONS } from '../../types/index'
import KnightAvatar from './KnightAvatar'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  formation: Formation
  slots: SlotAssignment[]
  onSlotClick?: (slotNumber: number) => void
  onSlotRemove?: (slotNumber: number) => void
  selectedKnightCount: number
  readonly?: boolean
  showSkills?: boolean   // false = hide skill queue even in edit mode (step 2)
}

// ─── Readonly skill queue display ─────────────────────────────────────────────

function ReadonlySkillQueue({ skillQueue, knight }: { skillQueue: SkillReservationData[]; knight: Knight }) {
  if (skillQueue.length === 0) return null
  // Sort by globalOrder so display matches actual queue order
  const sorted = [...skillQueue].sort((a, b) => a.globalOrder - b.globalOrder)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', width: '100%' }}>
      {sorted.map((skill, i) => {
        const imgUrl = skill.skillType === 'skill1' ? knight.img_skill_1
                     : skill.skillType === 'skill2' ? knight.img_skill_2
                     : undefined
        const meta = SKILL_OPTIONS.find(o => o.id === skill.skillType)

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: '#1e3a5f',
              borderRadius: '6px',
            }}
          >
            {/* Global order badge */}
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#f59e0b',
              color: '#000',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {skill.globalOrder}
            </div>

            {/* Skill image */}
            {imgUrl && (
              <img
                src={imgUrl}
                alt={skill.skillType}
                style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
              />
            )}

            {/* Fallback icon */}
            {!imgUrl && meta && (
              <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>{meta.icon}</span>
            )}

            <span style={{ fontSize: '11px', color: '#fff' }}>
              สกิลจองลำดับที่ {skill.globalOrder}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Single slot ─────────────────────────────────────────────────────────────

interface SlotProps {
  slot: SlotAssignment
  onSlotClick?: (n: number) => void
  onSlotRemove?: (n: number) => void
  canAdd: boolean
  readonly: boolean
  showSkills: boolean
}

function SlotCell({ slot, onSlotClick, onSlotRemove, canAdd, readonly, showSkills }: SlotProps) {
  const [hovered, setHovered] = useState(false)
  const hasKnight = slot.knight !== null

  // Determine slot button state
  let borderStyle: string
  let bgColor: string
  let cursor: string
  let opacity = 1

  if (hasKnight) {
    borderStyle = '2px solid #374151'
    bgColor = '#1f2937'
    cursor = 'default'
  } else if (readonly) {
    borderStyle = '2px dashed #2d4a7a'
    bgColor = '#1a2744'
    cursor = 'default'
    opacity = 0.7
  } else if (!readonly && canAdd) {
    borderStyle = `2px dashed ${hovered ? '#f59e0b' : '#374151'}`
    bgColor = '#1f2937'
    cursor = 'pointer'
  } else {
    borderStyle = '1.5px dashed #1f2937'
    bgColor = '#111827'
    cursor = 'not-allowed'
    opacity = 0.4
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      {/* Slot button */}
      <div
        onMouseEnter={() => !hasKnight && canAdd && !readonly && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !hasKnight && canAdd && !readonly && onSlotClick?.(slot.slotNumber)}
        style={{
          width: 'clamp(56px, 10vw, 80px)',
          height: 'clamp(56px, 10vw, 80px)',
          borderRadius: '10px',
          position: 'relative',
          background: bgColor,
          border: borderStyle,
          cursor,
          opacity,
          transition: 'border-color 0.15s',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: !hasKnight && readonly ? 'inset 0 0 12px rgba(59,130,246,0.08)' : undefined,
          flexShrink: 0,
        }}
      >
        {hasKnight ? (
          <>
            {/* Knight portrait */}
            <KnightAvatar knight={slot.knight!} size={80} />

            {/* Name overlay */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '3px 4px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              fontSize: '10px',
              color: '#fff',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {slot.knight!.name}
            </div>

            {/* Remove X (edit mode only) */}
            {!readonly && (
              <button
                onClick={e => { e.stopPropagation(); onSlotRemove?.(slot.slotNumber) }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '1.5px solid #0f172a',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  padding: 0,
                  zIndex: 2,
                }}
              >
                ✕
              </button>
            )}
          </>
        ) : (
          /* Empty slot content */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '22px', color: readonly ? '#4b6fa8' : '#374151', fontWeight: 'bold', lineHeight: 1 }}>
              {slot.slotNumber}
            </span>
            {!readonly && canAdd && (
              <span style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1 }}>+</span>
            )}
          </div>
        )}
      </div>

      {/* Skill queue — only when showSkills is enabled */}
      {hasKnight && showSkills && readonly && (
        <ReadonlySkillQueue skillQueue={slot.skillQueue} knight={slot.knight!} />
      )}

      {/* Slot label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: !hasKnight && readonly ? 0.7 : 1 }}>
        <span style={{ fontSize: '9px', color: !hasKnight && readonly ? '#374151' : '#6b7280' }}>Slot {slot.slotNumber}</span>
        <span style={{
          fontSize: '8px',
          color: !hasKnight && readonly ? '#374151' : slot.row === 'front' ? '#3b82f6' : '#9ca3af',
          background: !hasKnight && readonly ? '#0f172a' : slot.row === 'front' ? '#1e3a5f' : '#1f2937',
          border: `1px solid ${!hasKnight && readonly ? '#1e293b' : slot.row === 'front' ? '#3b82f640' : '#37415140'}`,
          borderRadius: '3px',
          padding: '0 3px',
          lineHeight: '14px',
        }}>
          {slot.row}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FormationBoard({
  formation: _formation,
  slots,
  onSlotClick,
  onSlotRemove,
  selectedKnightCount,
  readonly = false,
  showSkills = true,
}: Props) {
  const frontSlots = slots.filter(s => s.row === 'front')
  const backSlots  = slots.filter(s => s.row === 'back')
  const canAdd     = selectedKnightCount < 3

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center',
    }}>
      {/* ── Back row ──────────────────────────────────────────────────────── */}
      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.08em' }}>
        BACK
      </span>
      <div style={{ display: 'flex', gap: 'clamp(4px, 1vw, 10px)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {backSlots.map(slot => (
          <SlotCell
            key={slot.slotNumber}
            slot={slot}
            onSlotClick={onSlotClick}
            onSlotRemove={onSlotRemove}
            canAdd={canAdd}
            readonly={readonly}
            showSkills={showSkills}
          />
        ))}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, #1e2d47, transparent)',
      }} />

      {/* ── Front row ─────────────────────────────────────────────────────── */}
      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.08em' }}>
        FRONT
      </span>
      <div style={{ display: 'flex', gap: 'clamp(4px, 1vw, 10px)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {frontSlots.map(slot => (
          <SlotCell
            key={slot.slotNumber}
            slot={slot}
            onSlotClick={onSlotClick}
            onSlotRemove={onSlotRemove}
            canAdd={canAdd}
            readonly={readonly}
            showSkills={showSkills}
          />
        ))}
      </div>
    </div>
  )
}
