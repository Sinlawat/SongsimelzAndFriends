import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Formation, SlotAssignment, Knight, GVGCounter } from '../../types/index'
import { FORMATIONS } from '../../types/index'
import { useAuth } from '../../contexts/AuthContext'
import KnightAvatar from './KnightAvatar'
import FormationCard from './FormationCard'
import FormationBoard from './FormationBoard'
import KnightSelectModal from './KnightSelectModal'
import SkillQueueStep from './SkillQueueStep'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  defenseId: string
  defenseTeam: { leader: Knight; knight2: Knight; knight3?: Knight }
  onSuccess: (newCounter: GVGCounter) => void
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Formation' },
  { num: 2, label: 'Knights' },
  { num: 3, label: 'Skills' },
  { num: 4, label: 'Confirm' },
] as const

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 24px',
      borderBottom: '1px solid #1e2d47',
      backgroundColor: '#0f172a',
      gap: 0,
      flexShrink: 0,
    }}>
      {STEPS.map((step, i) => {
        const done   = step.num < current
        const active = step.num === current

        return (
          <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Connecting line before each step except the first */}
            {i > 0 && (
              <div style={{
                width: '40px',
                height: '2px',
                background: done ? '#22c55e' : '#1e2d47',
                transition: 'background 0.3s',
              }} />
            )}

            {/* Circle + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.3s',
                background:  done   ? '#22c55e'
                           : active ? '#f59e0b'
                           : '#1f2937',
                border: done   ? '2px solid #22c55e'
                      : active ? '2px solid #f59e0b'
                      : '2px solid #374151',
                color: (done || active) ? '#000' : '#6b7280',
              }}>
                {done ? '✓' : step.num}
              </div>
              <span style={{
                fontSize: '9px',
                fontWeight: active ? 'bold' : 'normal',
                color: done ? '#22c55e' : active ? '#f59e0b' : '#6b7280',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared bottom button row ─────────────────────────────────────────────────

interface FooterProps {
  onBack: (() => void) | null          // null = show Cancel
  onBackLabel?: string
  onNext: () => void
  nextLabel: string
  nextDisabled?: boolean
  isSubmitting?: boolean
  onCancel: () => void
}

function ModalFooter({ onBack, onBackLabel = '← Back', onNext, nextLabel, nextDisabled, isSubmitting, onCancel }: FooterProps) {
  const active = !nextDisabled && !isSubmitting
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px 20px',
      borderTop: '1px solid #1e2d47',
      flexShrink: 0,
    }}>
      <button
        onClick={onBack ?? onCancel}
        disabled={isSubmitting}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          background: 'transparent',
          color: '#6b7280',
          border: '1px solid #374151',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#9ca3af' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#6b7280' }}
      >
        {onBack ? onBackLabel : 'Cancel'}
      </button>

      <button
        onClick={onNext}
        disabled={!active}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 900,
          background: active ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)' : '#1e293b',
          color: active ? '#0a0c14' : '#374151',
          border: 'none',
          cursor: active ? 'pointer' : 'not-allowed',
          boxShadow: active ? '0 4px 16px rgba(245,158,11,0.25)' : 'none',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => { if (active) e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.45)' }}
        onMouseLeave={e => { if (active) e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.25)' }}
      >
        {isSubmitting ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid #37414166',
                borderTopColor: '#6b7280',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            กำลังบันทึก...
          </>
        ) : nextLabel}
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSlots(formation: Formation): SlotAssignment[] {
  const front: SlotAssignment[] = formation.frontSlots.map(n => ({
    slotNumber: n,
    row: 'front',
    knight: null,
    skillQueue: [],
  }))
  const back: SlotAssignment[] = formation.backSlots.map(n => ({
    slotNumber: n,
    row: 'back',
    knight: null,
    skillQueue: [],
  }))
  return [...front, ...back].sort((a, b) => a.slotNumber - b.slotNumber)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContributeModal({ isOpen, onClose, defenseId, defenseTeam, onSuccess }: Props) {
  const { user } = useAuth()

  const [step,               setStep]               = useState<1 | 2 | 3 | 4>(1)
  const [selectedFormation,  setSelectedFormation]  = useState<Formation | null>(null)
  const [slots,              setSlots]              = useState<SlotAssignment[]>([])
  const [openSlotNumber,     setOpenSlotNumber]     = useState<number | null>(null)
  const [strategy,           setStrategy]           = useState('')
  const [isSubmitting,       setIsSubmitting]       = useState(false)
  const [error,              setError]              = useState<string | null>(null)

  if (!isOpen) return null

  // ── Computed ──────────────────────────────────────────────────────────────
  const selectedKnightCount = slots.filter(s => s.knight !== null).length

  // ── Reset & close ─────────────────────────────────────────────────────────
  function handleClose() {
    setStep(1)
    setSelectedFormation(null)
    setSlots([])
    setOpenSlotNumber(null)
    setStrategy('')
    setError(null)
    onClose()
  }

  // ── Formation select ──────────────────────────────────────────────────────
  function handleSelectFormation(f: Formation) {
    setSelectedFormation(f)
    setSlots(buildSlots(f))
    setError(null)
  }

  // ── Slot interactions ─────────────────────────────────────────────────────
  function handleSlotClick(slotNumber: number) {
    if (selectedKnightCount >= 3) return
    setOpenSlotNumber(slotNumber)
  }

  function handleKnightSelect(knight: Knight) {
    if (openSlotNumber === null) return
    setSlots(prev => prev.map(s =>
      s.slotNumber === openSlotNumber ? { ...s, knight } : s
    ))
    setOpenSlotNumber(null)
  }

  function handleSlotRemove(slotNumber: number) {
    setSlots(prev => prev.map(s =>
      s.slotNumber === slotNumber ? { ...s, knight: null, skillQueue: [] } : s
    ))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedFormation) return
    const assignedSlots = slots.filter(s => s.knight !== null)
    if (assignedSlots.length < 2) return

    setIsSubmitting(true)
    setError(null)

    try {
      // ลองเช็ค Error
      console.log('=== DEBUG insertData ===')

      const slotPositions: Record<string, string> = {}
      slots.filter(s => s.knight !== null).forEach(s => {
        slotPositions[String(s.slotNumber)] = s.knight!.id
      })

      const skillQueues: Record<string, unknown[]> = {}
      slots.filter(s => s.knight).forEach(s => {
        skillQueues[s.knight!.id] = s.skillQueue
      })

      const insertData = {
        defense_id:     defenseId,
        leader_id:      assignedSlots[0]?.knight?.id,
        knight2_id:     assignedSlots[1]?.knight?.id,
        knight3_id:     assignedSlots[2]?.knight?.id ?? null,
        strategy:       strategy.trim() || null,
        formation_id:   selectedFormation.id,
        slot_positions: slotPositions,
        skill_queues:   skillQueues,
        submitted_by:   user?.email ?? 'Anonymous',
      }
      // ลองเพิ่มตรงนี้เช็ค error
      console.log('=== DEBUG insertData ===', JSON.stringify(insertData, null, 2))

      const { data, error: insertError } = await supabase
        .from('gvg_counters')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        // ✅ เพิ่มตรงนี้
        console.log('=== SUPABASE ERROR ===', JSON.stringify(insertError, null, 2))
        throw insertError
      }

      const newCounter: GVGCounter = {
        ...data,
        leader:  assignedSlots[0]!.knight!,
        knight2: assignedSlots[1]!.knight!,
        knight3: assignedSlots[2]?.knight ?? undefined,
      }

      onSuccess(newCounter)
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'กรุณาลองใหม่'
      setError('เกิดข้อผิดพลาด: ' + msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Overlay ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '72px',
          overflowY: 'auto',
        }}
        onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      >
        {/* ── Panel ─────────────────────────────────────────────────────────── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '90%',
            maxWidth: '660px',
            backgroundColor: '#111827',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e3a5f',
            padding: '14px 24px',
            flexShrink: 0,
          }}>
            <h2 style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', margin: 0 }}>
              ⚔️ Contribute Counter
            </h2>
            <button
              onClick={handleClose}
              style={{
                width: '28px', height: '28px',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px',
                background: '#1e293b',
                color: '#9ca3af',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#374151' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#1e293b' }}
            >
              ✕
            </button>
          </div>

          {/* ── Step indicator ──────────────────────────────────────────────── */}
          <StepIndicator current={step} />

          {/* ── Defense header (always visible) ─────────────────────────────── */}
          <div style={{ backgroundColor: '#0f172a', padding: '10px 24px', borderBottom: '1px solid #1e2d47', flexShrink: 0 }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b80', margin: '0 0 6px' }}>
              Counter for defense:
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <KnightAvatar knight={defenseTeam.leader}  size={36} showName />
              <KnightAvatar knight={defenseTeam.knight2} size={36} showName />
              {defenseTeam.knight3 && <KnightAvatar knight={defenseTeam.knight3} size={36} showName />}
            </div>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>

            {/* ════════════════ STEP 1: Formation ════════════════ */}
            {step === 1 && (
              <div style={{ padding: '20px 24px' }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
                  เลือกรูปแบบการวาง
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 160px)',
                  gap: '12px',
                  justifyContent: 'center',
                }}>
                  {FORMATIONS.map(f => (
                    <FormationCard
                      key={f.id}
                      formation={f}
                      isSelected={selectedFormation?.id === f.id}
                      onClick={() => handleSelectFormation(f)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ════════════════ STEP 2: Knights only ════════════════ */}
            {step === 2 && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                    วางฮีโร่ใน Formation
                  </p>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: selectedKnightCount >= 3 ? '#22c55e' : '#f59e0b',
                  }}>
                    {selectedKnightCount}/3 knights selected
                  </span>
                </div>

                {selectedKnightCount >= 3 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#14532d30',
                    border: '1px solid #22c55e40',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#86efac',
                  }}>
                    ✓ ครบ 3 ตัวแล้ว! กด Next เพื่อตั้ง Skill Queue
                  </div>
                )}

                {/* Formation board — NO skill pickers in this step */}
                <FormationBoard
                  formation={selectedFormation!}
                  slots={slots}
                  onSlotClick={handleSlotClick}
                  onSlotRemove={handleSlotRemove}
                  selectedKnightCount={selectedKnightCount}
                  readonly={false}
                  showSkills={false}
                />
              </div>
            )}

            {/* ════════════════ STEP 3: Skills ════════════════ */}
            {step === 3 && (
              <div style={{ padding: '1rem 1.5rem' }}>
                <SkillQueueStep
                  slots={slots.filter(s => s.knight !== null)}
                  onChange={(slotNumber, skillQueue) => {
                    setSlots(prev => prev.map(s =>
                      s.slotNumber === slotNumber ? { ...s, skillQueue } : s
                    ))
                  }}
                />

                {/* Strategy textarea */}
                <div style={{ marginTop: '1.25rem' }}>
                  <label style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                    Strategy / Tips (optional):
                  </label>
                  <textarea
                    value={strategy}
                    onChange={e => setStrategy(e.target.value)}
                    placeholder="อธิบายวิธีการ counter เช่น focus target ไหนก่อน, ลำดับการใช้สกิล..."
                    style={{
                      width: '100%',
                      height: '90px',
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: 'white',
                      fontSize: '13px',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.12)' }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>
            )}

            {/* ════════════════ STEP 4: Confirm ════════════════ */}
            {step === 4 && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header row: title + formation badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                    ยืนยัน Counter
                  </p>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#f59e0b',
                    backgroundColor: '#1e3a5f',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '3px 10px',
                  }}>
                    {selectedFormation?.name ?? 'Formation'}
                  </span>
                </div>

                {/* Readonly formation board WITH skill queue icons */}
                <FormationBoard
                  formation={selectedFormation!}
                  slots={slots}
                  selectedKnightCount={selectedKnightCount}
                  readonly
                  showSkills
                />

                {/* Strategy summary */}
                {strategy.trim() && (
                  <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', border: '1px solid #1e2d47' }}>
                    <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b80', margin: '0 0 6px' }}>
                      Strategy:
                    </p>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: 1.6 }}>
                      {strategy.trim()}
                    </p>
                  </div>
                )}

                <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #f59e0b40, transparent)' }} />

                <p style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 }}>
                  ข้อมูลจะถูกบันทึกและแสดงทันที
                </p>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#7f1d1d30', border: '1px solid #ef444450', color: '#fca5a5', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer buttons ───────────────────────────────────────────────── */}
          {step === 1 && (
            <ModalFooter
              onBack={null}
              onNext={() => { if (selectedFormation) setStep(2) }}
              nextLabel="Next →"
              nextDisabled={!selectedFormation}
              onCancel={handleClose}
            />
          )}
          {step === 2 && (
            <ModalFooter
              onBack={() => setStep(1)}
              onNext={() => { if (selectedKnightCount >= 2) setStep(3) }}
              nextLabel="Next →"
              nextDisabled={selectedKnightCount < 2}
              onCancel={handleClose}
            />
          )}
          {step === 3 && (
            <ModalFooter
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextLabel="Next →"
              onCancel={handleClose}
            />
          )}
          {step === 4 && (
            <ModalFooter
              onBack={() => { setStep(3); setError(null) }}
              onNext={handleSubmit}
              nextLabel="✓ Confirm & Submit"
              nextDisabled={isSubmitting}
              isSubmitting={isSubmitting}
              onCancel={handleClose}
            />
          )}
        </div>
      </div>

      {/* ── Knight picker (inner modal) ──────────────────────────────────────── */}
      <KnightSelectModal
        isOpen={openSlotNumber !== null}
        onClose={() => setOpenSlotNumber(null)}
        onSelect={handleKnightSelect}
        title={`Select knight for Slot ${openSlotNumber}`}
        allowAny={false}
      />
    </>
  )
}
