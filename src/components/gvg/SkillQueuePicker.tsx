import { useState, useRef, useEffect } from 'react'
import type { Knight } from '../../types/index'
import { SKILL_OPTIONS } from '../../types/index'
import KnightAvatar from './KnightAvatar'

interface Props {
  knight: Knight
  skillQueue: string[]
  onChange: (skills: string[]) => void
}

export default function SkillQueuePicker({ knight, skillQueue, onChange }: Props) {
  // which slot index (0/1/2) has its popup open, or null
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup on outside click
  useEffect(() => {
    if (openSlot === null) return
    function onPointerDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpenSlot(null)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openSlot])

  function handleSlotClick(index: number) {
    // Slot already filled → do nothing (use X to remove)
    if (skillQueue[index] !== undefined) return
    // Max 3 reached and this slot is empty → disabled (shouldn't normally be reached)
    if (skillQueue.length >= 3 && skillQueue[index] === undefined) return
    setOpenSlot(prev => (prev === index ? null : index))
  }

  function handleSelectSkill(skill: string) {
    if (openSlot === null) return
    const next = [...skillQueue]
    next[openSlot] = skill
    onChange(next)
    setOpenSlot(null)
  }

  function handleRemoveSkill(index: number, e: React.MouseEvent) {
    e.stopPropagation()
    const next = skillQueue.filter((_, i) => i !== index)
    onChange(next)
    setOpenSlot(null)
  }

  // Skills not yet chosen
  const available = SKILL_OPTIONS.filter(opt => !skillQueue.includes(opt.id))

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '8px',
      padding: '10px 12px',
    }}>
      {/* ── Top row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KnightAvatar knight={knight} size={32} />
          <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>
            {knight.name}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', letterSpacing: '0.04em' }}>
          Skill Queue
        </span>
      </div>

      {/* ── 3 skill slots ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        {[0, 1, 2].map(index => {
          const skillId   = skillQueue[index]
          const skillMeta = skillId ? SKILL_OPTIONS.find(o => o.id === skillId) : null
          const isFilled  = skillId !== undefined
          const isDisabled = !isFilled && skillQueue.length >= 3
          const isPopupOpen = openSlot === index

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', position: 'relative' }}>
              {/* Queue label */}
              <span style={{ fontSize: '9px', color: '#6b7280', textAlign: 'center', letterSpacing: '0.03em' }}>
                Queue {index + 1}
              </span>

              {/* Slot button */}
              <button
                onClick={() => !isFilled && !isDisabled && handleSlotClick(index)}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '8px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  cursor: isFilled ? 'default' : isDisabled ? 'not-allowed' : 'pointer',
                  background: isFilled ? '#1e3a5f' : '#1f2937',
                  border: isFilled
                    ? `2px solid ${isPopupOpen ? '#fbbf24' : '#f59e0b'}`
                    : `1.5px dashed ${isDisabled ? '#1f2937' : isPopupOpen ? '#f59e0b55' : '#374151'}`,
                  transition: 'border-color 0.15s, background 0.15s',
                  padding: 0,
                }}
              >
                {isFilled && skillMeta ? (
                  <>
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{skillMeta.icon}</span>
                    <span style={{ fontSize: '8px', color: '#e2e8f0', textAlign: 'center', lineHeight: 1, maxWidth: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {skillMeta.label}
                    </span>
                    {/* Remove X */}
                    <button
                      onClick={e => handleRemoveSkill(index, e)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
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
                      }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '20px', color: isDisabled ? '#1f2937' : '#4b5563', lineHeight: 1 }}>
                    +
                  </span>
                )}
              </button>

              {/* ── Skill selection popup ──────────────────────────────────── */}
              {isPopupOpen && (
                <div
                  ref={popupRef}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#111827',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    zIndex: 100,
                    minWidth: '130px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
                  }}
                >
                  {available.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                      No skills left
                    </div>
                  ) : (
                    available.map(opt => (
                      <SkillOption key={opt.id} opt={opt} onSelect={handleSelectSkill} />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skill option row ─────────────────────────────────────────────────────────

function SkillOption({
  opt,
  onSelect,
}: {
  opt: { id: string; label: string; icon: string }
  onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(opt.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '6px 12px',
        background: hovered ? '#1f2937' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '14px', lineHeight: 1 }}>{opt.icon}</span>
      <span style={{ fontSize: '12px', color: hovered ? '#f1f5f9' : '#d1d5db' }}>{opt.label}</span>
    </button>
  )
}
