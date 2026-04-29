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
  const sorted = [...skillQueue].sort((a, b) => a.globalOrder - b.globalOrder)
  return (
    <div className="flex flex-col gap-0.5 mt-1 w-full">
      {sorted.map((skill, i) => {
        const imgUrl = skill.skillType === 'skill1' ? knight.img_skill_1
                     : skill.skillType === 'skill2' ? knight.img_skill_2
                     : undefined
        const meta = SKILL_OPTIONS.find(o => o.id === skill.skillType)

        return (
          <div
            key={i}
            className="flex items-center gap-1 rounded px-1 py-0.5"
            style={{ background: '#1e3a5f' }}
          >
            {/* Order badge */}
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-black"
                 style={{ background: '#f59e0b' }}>
              {skill.globalOrder}
            </div>

            {/* Skill image or icon */}
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={skill.skillType}
                className="w-4 h-4 rounded shrink-0"
                style={{ objectFit: 'cover' }}
              />
            ) : meta ? (
              <span className="text-xs leading-none shrink-0">{meta.icon}</span>
            ) : null}

            <span className="text-[9px] text-white truncate">
              {skill.globalOrder}
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

  let borderStyle: string
  let bgColor: string
  let cursor: string
  let opacity = 1

  if (hasKnight) {
    borderStyle = !readonly && hovered ? '2px solid #f59e0b' : '2px solid #374151'
    bgColor = '#1f2937'
    cursor = readonly ? 'default' : 'pointer'
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
    <div className="flex flex-col items-center gap-1 w-14 sm:w-16 shrink-0">
      {/* Slot button */}
      <div
        onMouseEnter={() => !readonly && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !readonly && (hasKnight || canAdd) && onSlotClick?.(slot.slotNumber)}
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[10px] overflow-hidden flex items-center justify-center shrink-0"
        style={{
          background: bgColor,
          border: borderStyle,
          cursor,
          opacity,
          transition: 'border-color 0.15s',
          boxShadow: !hasKnight && readonly ? 'inset 0 0 12px rgba(59,130,246,0.08)' : undefined,
        }}
      >
        {hasKnight ? (
          <>
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
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold leading-none"
                  style={{ color: readonly ? '#4b6fa8' : '#374151' }}>
              {slot.slotNumber}
            </span>
            {!readonly && canAdd && (
              <span className="text-sm leading-none" style={{ color: '#4b5563' }}>+</span>
            )}
          </div>
        )}
      </div>

      {/* Skill queue — only when showSkills is enabled */}
      {hasKnight && showSkills && readonly && (
        <ReadonlySkillQueue skillQueue={slot.skillQueue} knight={slot.knight!} />
      )}

      {/* Slot label */}
      <div className="flex items-center gap-1" style={{ opacity: !hasKnight && readonly ? 0.7 : 1 }}>
        <span style={{ fontSize: '9px', color: !hasKnight && readonly ? '#374151' : '#6b7280' }}>
          Slot {slot.slotNumber}
        </span>
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
      <div className="w-full flex flex-col items-center gap-2">
        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.08em' }}>
          BACK
        </span>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
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
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, #1e2d47, transparent)',
      }} />

      {/* ── Front row ─────────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col items-center gap-2">
        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.08em' }}>
          FRONT
        </span>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
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
    </div>
  )
}
