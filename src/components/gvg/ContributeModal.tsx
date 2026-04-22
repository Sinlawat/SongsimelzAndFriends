import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Formation, SlotAssignment, Knight, GVGCounter, Equipment, EquipmentSlotType, KnightStats, Pet, SkillReservationData } from '../../types/index'
import { FORMATIONS, EQUIPMENT_SLOTS } from '../../types/index'
import { useAuth } from '../../contexts/AuthContext'
import KnightAvatar from './KnightAvatar'
import FormationCard from './FormationCard'
import FormationBoard from './FormationBoard'
import KnightSelectModal from './KnightSelectModal'
import SkillQueueStep from './SkillQueueStep'
import KnightEquipmentSlots from './KnightEquipmentSlots'
import EquipmentPickerModal from './EquipmentPickerModal'
import PetSelectModal from './PetSelectModal'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ExistingCounterData {
  id: string
  defenseId: string
  formation_id: number
  slot_positions: Record<string, string>
  skill_queues: Record<string, SkillReservationData[]>
  recommended_stats: Record<string, RecommendedEntry>
  pet_ids?: string[] | null
  strategy?: string | null
  knights: Knight[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  defenseId: string
  defenseTeam: { leader: Knight; knight2: Knight; knight3?: Knight }
  onSuccess: (newCounter: GVGCounter) => void
  editMode?: boolean
  initialData?: ExistingCounterData
  onEditSuccess?: () => void
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

// ─── Recommended entry type ───────────────────────────────────────────────────

type RecommendedEntry = Partial<KnightStats> & {
  weapon1?: string
  weapon2?: string
  armor1?: string
  armor2?: string
}

// ─── Equipment select options ─────────────────────────────────────────────────

const WEAPON_OPTIONS = [
  { label: 'HP (%)',              value: 'hp_pct'       },
  { label: 'Defense (%)',         value: 'def_pct'      },
  { label: 'Crit Rate',           value: 'crit_rate'    },
  { label: 'Crit Damage',         value: 'crit_dmg'     },
  { label: 'Weakness Hit Chance', value: 'weakness'     },
  { label: 'All Attack (%)',      value: 'atk_pct'      },
  { label: 'Effect Hit Rate',     value: 'eff_hit_rate' },
]

const ARMOR_OPTIONS = [
  { label: 'Damage Taken Reduction', value: 'dmg_reduction'  },
  { label: 'Block Rate',             value: 'block_rate'     },
  { label: 'All Attack (%)',         value: 'atk_pct'        },
  { label: 'Defense (%)',            value: 'def_pct'        },
  { label: 'HP (%)',                 value: 'hp_pct'         },
  { label: 'Effect Resistance',      value: 'eff_resistance' },
]

function EquipmentSelect({ label, value, type, onChange }: {
  label: string
  value: string
  type: 'weapon' | 'armor'
  onChange: (v: string) => void
}) {
  const options = type === 'weapon' ? WEAPON_OPTIONS : ARMOR_OPTIONS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '6px',
          padding: '5px 8px',
          color: value ? 'white' : '#4b5563',
          fontSize: '11px',
          outline: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onFocus={e  => { e.currentTarget.style.borderColor = '#f59e0b' }}
        onBlur={e   => { e.currentTarget.style.borderColor = '#374151' }}
      >
        <option value="">— เลือกไอเทม —</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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

export default function ContributeModal({ isOpen, onClose, defenseId, defenseTeam, onSuccess, editMode = false, initialData, onEditSuccess }: Props) {
  const { user } = useAuth()

  const [step,               setStep]               = useState<1 | 2 | 3 | 4>(1)
  const [selectedFormation,  setSelectedFormation]  = useState<Formation | null>(null)
  const [slots,              setSlots]              = useState<SlotAssignment[]>([])
  const [openSlotNumber,     setOpenSlotNumber]     = useState<number | null>(null)
  const [strategy,           setStrategy]           = useState('')
  const [isSubmitting,       setIsSubmitting]       = useState(false)
  const [error,              setError]              = useState<string | null>(null)

  const [knightEquipment, setKnightEquipment] = useState<
    Record<number, Record<EquipmentSlotType, Equipment | null>>
  >({})
  const [openEquipSlot, setOpenEquipSlot] = useState<{
    slotNumber: number
    slotType: EquipmentSlotType
  } | null>(null)

  const [recommendedStats, setRecommendedStats] = useState<
    Record<string, RecommendedEntry>
  >({})

  const [selectedPet,  setSelectedPet]  = useState<Pet | null>(null)
  const [openPetModal, setOpenPetModal] = useState(false)

  // Holds pre-built skill queues keyed by slot number, passed to SkillQueueStep
  const initialSkillQueuesRef = useRef<Record<number, SkillReservationData[]> | undefined>(undefined)

  // Initialise equipment + recommendedStats map when a knight is placed into a slot
  useEffect(() => {
    slots.filter(s => s.knight).forEach(s => {
      setKnightEquipment(prev => {
        if (prev[s.slotNumber]) return prev
        return {
          ...prev,
          [s.slotNumber]: { weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null },
        }
      })
      const knightId = s.knight!.id
      setRecommendedStats(prev => {
        if (prev[knightId] !== undefined) return prev
        return { ...prev, [knightId]: {} }
      })
    })
  }, [slots])

  // Pre-fill all state from initialData when opening in edit mode
  useEffect(() => {
    if (!isOpen || !editMode || !initialData) return

    const formation = FORMATIONS.find(f => f.id === initialData.formation_id) ?? null
    setSelectedFormation(formation)
    setStep(1)
    setError(null)
    setStrategy(initialData.strategy ?? '')
    setRecommendedStats((initialData.recommended_stats ?? {}) as Record<string, RecommendedEntry>)
    setKnightEquipment({})
    setOpenEquipSlot(null)

    if (formation) {
      const knightsById: Record<string, Knight> = {}
      initialData.knights.forEach(k => { knightsById[k.id] = k })

      const filledSlots = buildSlots(formation).map(slot => {
        const knightId = initialData.slot_positions?.[String(slot.slotNumber)]
        const knight = knightId ? (knightsById[knightId] ?? null) : null
        const skillQueue = knight ? (initialData.skill_queues?.[knight.id] ?? []) : []
        return { ...slot, knight, skillQueue }
      })
      setSlots(filledSlots)

      // Build initialQueues for SkillQueueStep (slot number → skill queue)
      const queues: Record<number, SkillReservationData[]> = {}
      filledSlots.forEach(s => {
        if (s.knight && s.skillQueue.length > 0) queues[s.slotNumber] = s.skillQueue
      })
      initialSkillQueuesRef.current = Object.keys(queues).length > 0 ? queues : undefined
    }

    // Fetch equipment items for this counter and populate knightEquipment by slot number
    const knightToSlot: Record<string, number> = {}
    Object.entries(initialData.slot_positions ?? {}).forEach(([slotNum, knightId]) => {
      knightToSlot[knightId] = Number(slotNum)
    })
    supabase
      .from('counter_knight_items')
      .select('*, equipment:equipment_id(*)')
      .eq('counter_id', initialData.id)
      .then(({ data: items }) => {
        if (!items || items.length === 0) return
        const equipMap: Record<number, Record<EquipmentSlotType, Equipment | null>> = {}
        items.forEach((item: { knight_id: string; slot_type: string; equipment: Equipment | null }) => {
          const slotNum = knightToSlot[item.knight_id]
          if (slotNum === undefined) return
          if (!equipMap[slotNum]) {
            equipMap[slotNum] = { weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null }
          }
          equipMap[slotNum][item.slot_type as EquipmentSlotType] = item.equipment
        })
        setKnightEquipment(equipMap)
      })

    // Fetch pet if present
    if (initialData.pet_ids?.[0]) {
      supabase.from('pets').select('*').eq('id', initialData.pet_ids[0]).single()
        .then(({ data }) => { if (data) setSelectedPet(data as Pet) })
    } else {
      setSelectedPet(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editMode, initialData?.id])

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
    setKnightEquipment({})
    setOpenEquipSlot(null)
    setRecommendedStats({})
    setSelectedPet(null)
    setOpenPetModal(false)
    initialSkillQueuesRef.current = undefined
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
    const isOccupied = slots.find(s => s.slotNumber === slotNumber)?.knight !== null
    if (!isOccupied && selectedKnightCount >= 3) return  // only block adding to a new empty slot when full
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
      const slotPositions: Record<string, string> = {}
      slots.filter(s => s.knight !== null).forEach(s => {
        slotPositions[String(s.slotNumber)] = s.knight!.id
      })

      const skillQueues: Record<string, unknown[]> = {}
      slots.filter(s => s.knight).forEach(s => {
        skillQueues[s.knight!.id] = s.skillQueue
      })

      const recStats: Record<string, RecommendedEntry> = {}
      slots.filter(s => s.knight).forEach(s => {
        const filtered = Object.fromEntries(
          Object.entries(recommendedStats[s.knight!.id] ?? {})
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
        )
        if (Object.keys(filtered).length > 0) {
          recStats[s.knight!.id] = filtered as RecommendedEntry
        }
      })

      // ── EDIT MODE: UPDATE existing row ────────────────────────────────────
      if (editMode && initialData?.id) {
        const { error: updateError } = await supabase
          .from('gvg_counters')
          .update({
            leader_id:         assignedSlots[0]?.knight?.id,
            knight2_id:        assignedSlots[1]?.knight?.id,
            knight3_id:        assignedSlots[2]?.knight?.id ?? null,
            strategy:          strategy.trim() || null,
            formation_id:      selectedFormation.id,
            slot_positions:    slotPositions,
            skill_queues:      skillQueues,
            recommended_stats: Object.keys(recStats).length > 0 ? recStats : null,
            pet_ids:           selectedPet ? [selectedPet.id] : null,
          })
          .eq('id', initialData.id)

        if (updateError) throw updateError

        // Replace all equipment items for this counter
        await supabase.from('counter_knight_items').delete().eq('counter_id', initialData.id)
        const editEquipmentInserts: Record<string, unknown>[] = []
        slots.filter(s => s.knight).forEach(slot => {
          const eq = knightEquipment[slot.slotNumber]
          if (!eq) return
          EQUIPMENT_SLOTS.forEach(({ type }) => {
            if (eq[type]) {
              editEquipmentInserts.push({
                counter_id:   initialData.id,
                knight_id:    slot.knight!.id,
                slot_type:    type,
                equipment_id: eq[type]!.id,
              })
            }
          })
        })
        if (editEquipmentInserts.length > 0) {
          await supabase.from('counter_knight_items').insert(editEquipmentInserts)
        }

        onEditSuccess?.()
        handleClose()
        return
      }

      // ── NEW MODE: INSERT ──────────────────────────────────────────────────
      const insertData = {
        defense_id:        defenseId,
        leader_id:         assignedSlots[0]?.knight?.id,
        knight2_id:        assignedSlots[1]?.knight?.id,
        knight3_id:        assignedSlots[2]?.knight?.id ?? null,
        strategy:          strategy.trim() || null,
        formation_id:      selectedFormation.id,
        slot_positions:    slotPositions,
        skill_queues:      skillQueues,
        submitted_by:      user?.email ?? 'Anonymous',
        recommended_stats: Object.keys(recStats).length > 0 ? recStats : null,
        pet_ids: selectedPet ? [selectedPet.id] : null,
      }

      const { data, error: insertError } = await supabase
        .from('gvg_counters')
        .insert(insertData)
        .select()
        .single()

      if (insertError) throw insertError

      // Save equipment items for each knight
      const equipmentInserts: Record<string, unknown>[] = []
      slots.filter(s => s.knight).forEach(slot => {
        const eq = knightEquipment[slot.slotNumber]
        if (!eq) return
        EQUIPMENT_SLOTS.forEach(({ type }) => {
          if (eq[type]) {
            equipmentInserts.push({
              counter_id:   data.id,
              knight_id:    slot.knight!.id,
              slot_type:    type,
              equipment_id: eq[type]!.id,
            })
          }
        })
      })
      if (equipmentInserts.length > 0) {
        await supabase.from('counter_knight_items').insert(equipmentInserts)
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
      >
        {/* ── Panel ─────────────────────────────────────────────────────────── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '90%',
            maxWidth: '660px',
            maxHeight: 'calc(100dvh - 100px)',
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
              {editMode ? '✏️ แก้ไข Counter' : '⚔️ Contribute Counter'}
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
          <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>

            {/* ════════════════ STEP 1: Formation ════════════════ */}
            {step === 1 && (
              <div className="p-3 sm:p-6">
                <p className="text-sm sm:text-base font-bold mb-2 sm:mb-4" style={{ color: '#f59e0b' }}>
                  เลือกรูปแบบการวาง
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

            {/* ════════════════ STEP 2: Knights + Pets ════════════════ */}
            {step === 2 && (
              <div className="p-3 sm:p-6 flex flex-col gap-3 sm:gap-4">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                    วางฮีโร่ใน Formation
                  </p>
                  <span style={{
                    fontSize: '12px', fontWeight: 'bold',
                    color: selectedKnightCount >= 3 ? '#22c55e' : '#f59e0b',
                  }}>
                    {selectedKnightCount}/3 knights selected
                  </span>
                </div>

                {selectedKnightCount >= 3 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', background: '#14532d30',
                    border: '1px solid #22c55e40', borderRadius: '8px',
                    fontSize: '12px', color: '#86efac',
                  }}>
                    ✓ ครบ 3 ตัวแล้ว! กด Next เพื่อตั้ง Skill Queue
                  </div>
                )}

                {/* Formation board + pet — stacked on mobile, side-by-side on sm+ */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">

                  {/* Formation board — full width on mobile */}
                  <div className="flex-1 min-w-0 w-full">
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

                  {/* Pet selection — inline row on mobile, column on sm+ */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:w-36 sm:shrink-0">
                    <p className="text-[11px] font-bold shrink-0 m-0" style={{ color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      🐾 สัตว์เลี้ยง
                    </p>

                    <button
                      onClick={() => setOpenPetModal(true)}
                      className="w-14 h-14 sm:w-[110px] sm:h-[110px] rounded-lg relative overflow-hidden shrink-0"
                      style={{
                        border: selectedPet ? '2px solid #a855f7' : '1.5px dashed #374151',
                        background: selectedPet ? '#2d1b69' : '#1f2937',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '4px',
                        transition: 'all 0.15s', padding: 0,
                      }}
                      onMouseEnter={e => { if (!selectedPet) e.currentTarget.style.borderColor = '#a855f7' }}
                      onMouseLeave={e => { if (!selectedPet) e.currentTarget.style.borderColor = '#374151' }}
                    >
                      {selectedPet ? (
                        <>
                          {selectedPet.image_url ? (
                            <img
                              src={selectedPet.image_url}
                              alt={selectedPet.name}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                              onError={e => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <span style={{ fontSize: '32px', lineHeight: 1 }}>🐾</span>
                          )}
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(0,0,0,0.65)', padding: '3px 4px',
                          }}>
                            <span style={{ fontSize: '9px', color: 'white', display: 'block', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {selectedPet.name}
                            </span>
                          </div>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={e => { e.stopPropagation(); setSelectedPet(null) }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setSelectedPet(null) } }}
                            style={{
                              position: 'absolute', top: '4px', right: '4px',
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: '#ef4444', color: 'white',
                              fontSize: '10px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              zIndex: 2,
                            }}
                          >
                            ✕
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '26px', lineHeight: 1, opacity: 0.4 }}>🐾</span>
                          <span style={{ fontSize: '9px', color: '#6b7280' }}>เลือกสัตว์เลี้ยง</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════ STEP 3: Skills ════════════════ */}
            {step === 3 && (
              <div className="p-3 sm:p-6">

                {/* ── Equipment section ──────────────────────────────────────── */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 12px' }}>
                    🗡️ ใส่อุปกรณ์ (optional)
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {slots.filter(s => s.knight !== null).map(slot => (
                      <div key={slot.slotNumber} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* Knight name */}
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af' }}>
                          {slot.knight!.name}
                        </span>

                        {/* Equipment slots */}
                        <KnightEquipmentSlots
                          knight={slot.knight!}
                          items={knightEquipment[slot.slotNumber] ?? { weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null }}
                          onSlotClick={(slotType: EquipmentSlotType) => {
                            const current = knightEquipment[slot.slotNumber]?.[slotType]
                            if (current) {
                              setKnightEquipment(prev => ({
                                ...prev,
                                [slot.slotNumber]: { ...prev[slot.slotNumber], [slotType]: null },
                              }))
                            } else {
                              setOpenEquipSlot({ slotNumber: slot.slotNumber, slotType })
                            }
                          }}
                          readonly={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Recommended Stats section ──────────────────────────────── */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '12px' }}>
                    🎯 Recommended Stats (optional)
                  </p>
                  <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', marginTop: '-8px' }}>
                    กรอก stat ที่แนะนำให้มีสำหรับแต่ละตัวละคร เพื่อให้ผู้ใช้คนอื่นทราบ
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {slots.filter(s => s.knight !== null).map(slot => {
                      const knight = slot.knight!
                      const stats  = recommendedStats[knight.id] ?? {}

                      const STAT_FIELDS: { key: keyof KnightStats; label: string; isPercent?: boolean }[] = [
                        { key: 'base_hp',                    label: 'HP'             },
                        { key: 'base_attack_physical',       label: 'ATK (Physical)' },
                        { key: 'base_attack_magic',          label: 'ATK (Magic)'    },
                        { key: 'base_defense',               label: 'DEF'            },
                        { key: 'base_speed',                 label: 'SPD'            },
                        { key: 'base_crit_rate',             label: 'CRIT Rate',      isPercent: true },
                        { key: 'base_crit_damage',           label: 'CRIT DMG',       isPercent: true },
                        { key: 'base_resistance',            label: 'Resistance',     isPercent: true },
                        { key: 'base_effective_hit_rate',    label: 'Eff. Hit Rate',  isPercent: true },
                        { key: 'base_block_rate',            label: 'Block Rate'     },
                        { key: 'base_weakness',              label: 'Weakness'       },
                        { key: 'base_damage_taken_reduction',label: 'DMG Reduction'  },
                      ]

                      return (
                        <div key={knight.id} style={{
                          background: '#0f172a', border: '1px solid #1e293b',
                          borderRadius: '10px', padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <KnightAvatar knight={knight} size={28} showName={false} />
                            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 'bold' }}>
                              {knight.name}
                            </span>
                          </div>

                          {/* Equipment selectors — 2×2 grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '10px' }}>
                            <EquipmentSelect
                              label="อาวุธ 1"
                              value={recommendedStats[knight.id]?.weapon1 ?? ''}
                              type="weapon"
                              onChange={v => setRecommendedStats(prev => ({ ...prev, [knight.id]: { ...prev[knight.id], weapon1: v } }))}
                            />
                            <EquipmentSelect
                              label="อาวุธ 2"
                              value={recommendedStats[knight.id]?.weapon2 ?? ''}
                              type="weapon"
                              onChange={v => setRecommendedStats(prev => ({ ...prev, [knight.id]: { ...prev[knight.id], weapon2: v } }))}
                            />
                            <EquipmentSelect
                              label="เกราะ 1"
                              value={recommendedStats[knight.id]?.armor1 ?? ''}
                              type="armor"
                              onChange={v => setRecommendedStats(prev => ({ ...prev, [knight.id]: { ...prev[knight.id], armor1: v } }))}
                            />
                            <EquipmentSelect
                              label="เกราะ 2"
                              value={recommendedStats[knight.id]?.armor2 ?? ''}
                              type="armor"
                              onChange={v => setRecommendedStats(prev => ({ ...prev, [knight.id]: { ...prev[knight.id], armor2: v } }))}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            {STAT_FIELDS.map(field => (
                              <div key={field.key} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#111827', borderRadius: '6px', padding: '4px 8px',
                              }}>
                                <span style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap', minWidth: '70px' }}>
                                  {field.label}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={stats[field.key] ?? ''}
                                    onChange={e => {
                                      const val = e.target.value === '' ? undefined : Number(e.target.value)
                                      setRecommendedStats(prev => ({
                                        ...prev,
                                        [knight.id]: { ...prev[knight.id], [field.key]: val },
                                      }))
                                    }}
                                    style={{
                                      width: '100%', background: 'transparent',
                                      border: 'none', outline: 'none',
                                      color: 'white', fontSize: '12px', fontWeight: 'bold',
                                      textAlign: 'right',
                                    }}
                                  />
                                  {field.isPercent && (
                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>%</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => setRecommendedStats(prev => ({ ...prev, [knight.id]: {} }))}
                            style={{
                              marginTop: '8px', fontSize: '10px', color: '#4b5563',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 0, textDecoration: 'underline',
                            }}
                          >
                            ล้างค่าทั้งหมด
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <SkillQueueStep
                  slots={slots.filter(s => s.knight !== null)}
                  initialQueues={initialSkillQueuesRef.current}
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
                      height: '64px',
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
                    {editMode ? 'กำลังแก้ไข Counter ที่มีอยู่' : 'ยืนยัน Counter'}
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
              nextLabel={editMode ? '💾 บันทึกการแก้ไข' : '✓ Confirm & Submit'}
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

      {/* ── Equipment picker (inner modal) ───────────────────────────────────── */}
      <EquipmentPickerModal
        isOpen={openEquipSlot !== null}
        onClose={() => setOpenEquipSlot(null)}
        slotType={openEquipSlot?.slotType ?? 'weapon1'}
        currentEquipmentId={
          openEquipSlot
            ? knightEquipment[openEquipSlot.slotNumber]?.[openEquipSlot.slotType]?.id ?? null
            : null
        }
        onSelect={(equipment) => {
          if (!openEquipSlot) return
          setKnightEquipment(prev => ({
            ...prev,
            [openEquipSlot.slotNumber]: {
              ...prev[openEquipSlot.slotNumber],
              [openEquipSlot.slotType]: equipment,
            },
          }))
          setOpenEquipSlot(null)
        }}
      />

      {/* ── Pet picker (inner modal) ─────────────────────────────────────────── */}
      <PetSelectModal
        isOpen={openPetModal}
        onClose={() => setOpenPetModal(false)}
        slotLabel="ทีม Counter"
        currentPetId={selectedPet?.id ?? null}
        onSelect={pet => { setSelectedPet(pet); setOpenPetModal(false) }}
      />
    </>
  )
}
