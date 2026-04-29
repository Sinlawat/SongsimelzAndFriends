import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type {
  Knight, StatTarget, ParsedEquipmentItem,
  TranscendBonus, EquipmentSlotType, ConstraintType,
} from '../types/index'
import { getKnightStats } from '../types/index'
import { calculateTranscendStats } from '../utils/transcendStats'
import { multiKnightOptimize } from '../utils/multiKnightOptimizer'
import type { MultiKnightResult, KnightOptConfig } from '../utils/multiKnightOptimizer'
import { saveSet } from '../lib/savedSets'
import type { SavedSetItem } from '../lib/savedSets'
import { useAuth } from '../contexts/AuthContext'
import JsonUploader from './JsonUploader'
import KnightSelectModal from './gvg/KnightSelectModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_BADGES = ['🥇', '🥈', '🥉']

const SLOT_ORDER: EquipmentSlotType[] = ['weapon1', 'weapon2', 'armor1', 'armor2', 'ring']
const SLOT_LABELS: Record<EquipmentSlotType, string> = {
  weapon1: 'W1', weapon2: 'W2', armor1: 'A1', armor2: 'A2', ring: 'Ring',
}

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  maximize: 'Maximize', minimize: 'Minimize', exactly: 'Exactly',
  range: 'Range', at_least: 'At Least', at_most: 'At Most',
}

function makeDefaultTargets(): StatTarget[] {
  return [
    { stat_key: 'base_attack_physical', label: 'ATK (Physical)',   constraint: 'maximize', weight: 10 },
    { stat_key: 'base_attack_magic',    label: 'ATK (Magic)',      constraint: 'maximize', weight: 10 },
    { stat_key: 'base_speed',           label: 'Speed',            constraint: 'exactly',  target_value: 0, weight: 8 },
    { stat_key: 'base_crit_rate',       label: 'Crit Rate (%)',    constraint: 'range',    min_value: 0, max_value: 95, preferred_value: 0, weight: 9 },
    { stat_key: 'base_crit_damage',     label: 'Crit Damage (%)',  constraint: 'maximize', weight: 7 },
    { stat_key: 'base_weakness',        label: 'Weakness Hit (%)', constraint: 'range',    min_value: 0, max_value: 50, preferred_value: 0, weight: 8 },
  ]
}

// ─── Slot state ───────────────────────────────────────────────────────────────

interface SlotState {
  id: string
  knight: Knight | null
  transcendLevel: number
  knightTranscends: TranscendBonus[]
  transcendLoaded: boolean
  targets: StatTarget[]
  weaponType: 'physical' | 'magic'
  showConstraints: boolean
}

// ─── ConstraintRow ────────────────────────────────────────────────────────────

function ConstraintRow({ target, onChange }: { target: StatTarget; onChange: (t: StatTarget) => void }) {
  const inputStyle: React.CSSProperties = {
    width: '64px', background: '#0a0c14', border: '1px solid #374151',
    borderRadius: '6px', padding: '4px 6px', color: 'white', fontSize: '11px', outline: 'none',
  }
  return (
    <div style={{ background: '#0a0c14', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 10px', marginBottom: '4px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '6px' }}>{target.label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
        <select
          value={target.constraint}
          onChange={e => onChange({ ...target, constraint: e.target.value as ConstraintType })}
          style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '5px', padding: '3px 6px', color: '#e2e8f0', fontSize: '11px', outline: 'none' }}
        >
          {(Object.keys(CONSTRAINT_LABELS) as ConstraintType[]).map(c => (
            <option key={c} value={c}>{CONSTRAINT_LABELS[c]}</option>
          ))}
        </select>
        {target.constraint === 'exactly' && (
          <input type="number" value={target.target_value ?? 0}
            onChange={e => onChange({ ...target, target_value: +e.target.value })} style={inputStyle} />
        )}
        {(target.constraint === 'at_least' || target.constraint === 'at_most') && (
          <input type="number" value={target.target_value ?? 0}
            onChange={e => onChange({ ...target, target_value: +e.target.value })} style={inputStyle} />
        )}
        {target.constraint === 'range' && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#9ca3af' }}>
              Min <input type="number" value={target.min_value ?? 0} onChange={e => onChange({ ...target, min_value: +e.target.value })} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#9ca3af' }}>
              Max <input type="number" value={target.max_value ?? 0} onChange={e => onChange({ ...target, max_value: +e.target.value })} style={inputStyle} />
            </label>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>Wt:</span>
          <input type="range" min={1} max={10} value={target.weight}
            onChange={e => onChange({ ...target, weight: +e.target.value })}
            style={{ width: '60px', accentColor: '#f59e0b' }} />
          <span style={{ fontSize: '10px', color: '#f59e0b', minWidth: '12px' }}>{target.weight}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Knight slot row ──────────────────────────────────────────────────────────

interface SlotRowProps {
  slot: SlotState
  priority: number
  isFirst: boolean
  isLast: boolean
  onSelectKnight: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onUpdate: (patch: Partial<SlotState>) => void
}

function KnightSlotRow({ slot, priority, isFirst, isLast, onSelectKnight, onMoveUp, onMoveDown, onRemove, onUpdate }: SlotRowProps) {
  const badge = PRIORITY_BADGES[priority - 1] ?? `P${priority}`

  return (
    <div style={{ border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#0f172a' }}>

        {/* Priority badge */}
        <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, width: '28px', textAlign: 'center' }}>{badge}</span>

        {/* Knight selector */}
        <button
          onClick={onSelectKnight}
          style={{
            flex: 1, minWidth: 0, height: '36px', background: '#1f2937',
            border: '1px solid #374151', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '0 10px', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151' }}
        >
          {slot.knight ? (
            <>
              {slot.knight.image_url && (
                <img src={slot.knight.image_url} alt={slot.knight.name}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {slot.knight.name}
              </span>
              <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: 'auto', flexShrink: 0 }}>{slot.knight.class}</span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>เลือกอัศวิน...</span>
          )}
        </button>

        {/* Weapon type toggle */}
        {slot.knight && (
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #374151', flexShrink: 0 }}>
            {(['physical', 'magic'] as const).map(wt => (
              <button key={wt}
                onClick={() => onUpdate({ weaponType: wt })}
                style={{
                  padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                  border: 'none', transition: 'all 0.15s',
                  background: slot.weaponType === wt ? '#f59e0b' : '#1f2937',
                  color: slot.weaponType === wt ? '#000' : '#6b7280',
                }}
              >
                {wt === 'physical' ? '⚔️' : '✨'}
              </button>
            ))}
          </div>
        )}

        {/* Constraints toggle */}
        {slot.knight && (
          <button
            onClick={() => onUpdate({ showConstraints: !slot.showConstraints })}
            style={{
              padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
              borderRadius: '6px', border: `1px solid ${slot.showConstraints ? '#f59e0b' : '#374151'}`,
              background: slot.showConstraints ? '#1e3a5f' : '#1f2937',
              color: slot.showConstraints ? '#f59e0b' : '#6b7280',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            ⚙ Stat
          </button>
        )}

        {/* Reorder buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <button onClick={onMoveUp} disabled={isFirst}
            style={{ width: '18px', height: '14px', fontSize: '8px', cursor: isFirst ? 'not-allowed' : 'pointer', background: '#1f2937', border: '1px solid #374151', borderRadius: '3px', color: isFirst ? '#374151' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            ▲
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            style={{ width: '18px', height: '14px', fontSize: '8px', cursor: isLast ? 'not-allowed' : 'pointer', background: '#1f2937', border: '1px solid #374151', borderRadius: '3px', color: isLast ? '#374151' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            ▼
          </button>
        </div>

        {/* Remove */}
        <button onClick={onRemove}
          style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1f2937', border: '1px solid #374151', color: '#6b7280', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#450a0a'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#374151' }}
        >
          ✕
        </button>
      </div>

      {/* Transcend level selector */}
      {slot.knight && (
        <div style={{ padding: '8px 12px', background: '#0a0c14', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0 }}>Transcend:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Array.from({ length: 13 }, (_, i) => i).map(lv => (
              <button key={lv} onClick={() => onUpdate({ transcendLevel: lv })}
                style={{
                  width: '28px', height: '24px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                  border: slot.transcendLevel === lv ? '2px solid #f59e0b' : '1px solid #374151',
                  background: slot.transcendLevel === lv ? '#f59e0b' : lv > 0 && lv <= slot.transcendLevel ? '#451a03' : '#1f2937',
                  color: slot.transcendLevel === lv ? '#000' : lv > 0 && lv <= slot.transcendLevel ? '#fbbf24' : '#6b7280',
                  transition: 'all 0.1s',
                }}
              >
                {lv}
              </button>
            ))}
          </div>
          {slot.transcendLevel > 0 && (
            <span style={{ fontSize: '10px', color: '#f59e0b', marginLeft: 'auto', flexShrink: 0 }}>
              T{slot.transcendLevel}{!slot.transcendLoaded ? ' (loading…)' : ''}
            </span>
          )}
        </div>
      )}

      {/* Constraints panel */}
      {slot.knight && slot.showConstraints && (
        <div style={{ padding: '10px 12px', background: '#070a12', borderTop: '1px solid #1e293b' }}>
          <p style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 'bold', margin: '0 0 8px' }}>📊 Stat Targets</p>
          {slot.targets.map((t, i) => (
            <ConstraintRow key={t.stat_key} target={t}
              onChange={updated => onUpdate({ targets: slot.targets.map((x, xi) => xi === i ? updated : x) })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Result section (per knight) ──────────────────────────────────────────────

function KnightResultCard({ res, sourceFile, onSaveSuccess }: { res: MultiKnightResult; sourceFile: string | null; onSaveSuccess?: () => void }) {
  const { user } = useAuth()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const badge = PRIORITY_BADGES[res.priority - 1] ?? `P${res.priority}`
  const { config, result } = res
  const baseStats = config.baseStats as unknown as Record<string, number>

  async function handleSave() {
    if (!user) { setSaveStatus('error'); return }
    setSaveStatus('saving')
    const equipment_items: SavedSetItem[] = Object.values(result!.slots)
      .filter((item): item is ParsedEquipmentItem => item !== null)
      .map(item => ({
        run_no:            item.run_no,
        slot_type:         item.slot_type,
        name:              item.name,
        set_name:          item.set_name ?? null,
        main_stat_display: item.main_stats.map(s => s.display).join(', '),
      }))
    const saved = await saveSet({
      knight_name:     config.knight.name,
      set_name:        `${config.knight.name} - Multi Opt`,
      source_file:     sourceFile,
      equipment_items,
    })
    setSaveStatus(saved ? 'saved' : 'error')
    if (saved) onSaveSuccess?.()
  }

  if (!result) {
    return (
      <div style={{ background: '#1c0a00', border: '1px solid #c2410c', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{badge}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fb923c' }}>{config.knight.name}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              ⚠️ ไม่มีอุปกรณ์เพียงพอในพูล
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#0f172a', border: `1px solid ${res.priority === 1 ? '#f59e0b' : '#1e293b'}`, borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{badge}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e2e8f0' }}>{config.knight.name}</div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>Priority {res.priority}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: result.meets_all_constraints ? '#22c55e' : '#f59e0b' }}>
            {result.score.toFixed(1)}%
          </div>
          <div style={{ fontSize: '10px', color: result.meets_all_constraints ? '#22c55e' : '#f59e0b' }}>
            {result.meets_all_constraints ? '✅ ผ่านทุก constraint' : `⚠️ ${result.violations.length} เงื่อนไขไม่ผ่าน`}
          </div>
        </div>
      </div>

      {/* Equipment slots */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {SLOT_ORDER.map(slotType => {
          const item = result.slots[slotType]
          return (
            <div key={slotType} style={{
              width: '80px', minHeight: '52px',
              background: item ? '#111827' : '#0a0c14',
              border: item ? '1px solid #374151' : '1px dashed #1e293b',
              borderRadius: '8px', padding: '6px 8px',
            }}>
              <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>{SLOT_LABELS[slotType]}</div>
              {item ? (
                <>
                  <div style={{ fontSize: '9px', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '8px', color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.set_name ?? '—'}
                  </div>
                  <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>#{item.run_no}</div>
                </>
              ) : (
                <div style={{ fontSize: '9px', color: '#374151', textAlign: 'center', marginTop: '8px' }}>—</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stat table */}
      <div style={{ background: '#111827', borderRadius: '6px', border: '1px solid #1e293b', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px auto 28px', padding: '4px 8px', background: '#1e293b', fontSize: '9px', fontWeight: 'bold', color: '#6b7280', gap: '4px' }}>
          <span>Stat</span><span style={{ textAlign: 'right' }}>Base</span>
          <span style={{ textAlign: 'right' }}>+Item</span><span style={{ textAlign: 'right' }}>Total</span>
          <span>Target</span><span />
        </div>
        {config.targets.map((t, i) => {
          const base  = baseStats[t.stat_key] ?? 0
          const total = result.final_stats[t.stat_key] ?? 0
          const added = total - base
          const violated = result.violations.some(v => v.startsWith(t.label))
          let targetLabel = ''
          switch (t.constraint) {
            case 'maximize': targetLabel = 'Max'; break
            case 'minimize': targetLabel = 'Min'; break
            case 'exactly':  targetLabel = `=${t.target_value}`; break
            case 'at_least': targetLabel = `≥${t.target_value}`; break
            case 'at_most':  targetLabel = `≤${t.target_value}`; break
            case 'range':    targetLabel = `${t.min_value}–${t.max_value}`; break
          }
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 56px auto 28px', padding: '4px 8px', gap: '4px', fontSize: '11px', borderTop: i > 0 ? '1px solid #1e293b' : undefined, alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>{t.label}</span>
              <span style={{ textAlign: 'right', color: '#6b7280' }}>{Math.round(base)}</span>
              <span style={{ textAlign: 'right', color: added > 0 ? '#22c55e' : '#6b7280' }}>{added > 0 ? `+${Math.round(added)}` : '—'}</span>
              <span style={{ textAlign: 'right', color: 'white', fontWeight: 'bold' }}>{Math.round(total)}</span>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>{targetLabel}</span>
              <span style={{ textAlign: 'center', color: violated ? '#ef4444' : '#22c55e' }}>{violated ? '❌' : '✅'}</span>
            </div>
          )
        })}
      </div>

      {/* Violations */}
      {result.violations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {result.violations.map((v, i) => (
            <span key={i} style={{ fontSize: '10px', color: '#fca5a5', background: '#450a0a', border: '1px solid #991b1b', borderRadius: '4px', padding: '2px 8px' }}>{v}</span>
          ))}
        </div>
      )}

      {/* Save button */}
      {!user ? (
        <p style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', margin: '8px 0 0' }}>
          กรุณาเข้าสู่ระบบก่อนบันทึก
        </p>
      ) : (
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving' || saveStatus === 'saved'}
          style={{
            marginTop: '8px',
            width: '100%', height: '38px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 'bold', border: 'none',
            cursor: saveStatus === 'saving' || saveStatus === 'saved' ? 'default' : 'pointer',
            background: saveStatus === 'saved'
              ? '#14532d'
              : saveStatus === 'error'
              ? '#450a0a'
              : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
            color: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'error' ? '#fca5a5' : '#0a0c14',
            transition: 'opacity 0.15s',
          }}
        >
          {saveStatus === 'saving' ? 'กำลังบันทึก…'
           : saveStatus === 'saved' ? '✅ บันทึกแล้ว'
           : saveStatus === 'error' ? '❌ บันทึกไม่สำเร็จ — ลองอีกครั้ง'
           : `💾 บันทึกเซ็ท ${config.knight.name}`}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: () => void
}

export default function MultiKnightOptimizer({ isOpen, onClose, onSaveSuccess }: Props) {
  const [activeTab,       setActiveTab]       = useState<1 | 2>(1)
  const [importedItems,   setImportedItems]   = useState<ParsedEquipmentItem[]>([])
  const [uploadedFileName,setUploadedFileName]= useState<string | null>(null)
  const [globalTranscends,setGlobalTranscends]= useState<TranscendBonus[]>([])
  const [isOptimizing,    setIsOptimizing]    = useState(false)
  const [results,         setResults]         = useState<MultiKnightResult[]>([])
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null)

  const idCounter = useRef(0)

  function makeSlot(): SlotState {
    return {
      id: String(++idCounter.current),
      knight: null, transcendLevel: 0,
      knightTranscends: [], transcendLoaded: false,
      targets: makeDefaultTargets(), weaponType: 'physical', showConstraints: false,
    }
  }

  const [slots, setSlots] = useState<SlotState[]>(() => [makeSlot()])

  // Fetch global transcends once on open
  useEffect(() => {
    if (!isOpen) return
    supabase.from('global_transcend_bonuses').select('*').then(({ data }) => {
      setGlobalTranscends(data ?? [])
    })
  }, [isOpen])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(1)
      setImportedItems([])
      setUploadedFileName(null)
      setResults([])
      setSlots([makeSlot()])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  // ── Slot management ──────────────────────────────────────────────────────────

  function addSlot() {
    if (slots.length >= 3) return
    setSlots(prev => [...prev, makeSlot()])
  }

  function removeSlot(id: string) {
    setSlots(prev => {
      const next = prev.filter(s => s.id !== id)
      return next.length > 0 ? next : [makeSlot()]
    })
  }

  function moveSlot(id: string, dir: -1 | 1) {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function updateSlot(id: string, patch: Partial<SlotState>) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function handleKnightSelected(knight: Knight) {
    const slotId = selectingSlotId
    if (!slotId) return
    setSelectingSlotId(null)

    // Reset transcend state while fetching
    updateSlot(slotId, { knight, transcendLevel: 0, knightTranscends: [], transcendLoaded: false })

    supabase
      .from('knight_transcend_bonuses')
      .select('*')
      .eq('knight_id', knight.id)
      .then(({ data }) => {
        setSlots(prev => prev.map(s =>
          s.id === slotId ? { ...s, knightTranscends: data ?? [], transcendLoaded: true } : s
        ))
      })
  }

  // ── Optimization ─────────────────────────────────────────────────────────────

  function startOptimization() {
    const configs: KnightOptConfig[] = slots
      .filter(s => s.knight !== null)
      .map(s => {
        const rawStats = getKnightStats(s.knight!)
        if (!rawStats) return null
        const boosted = calculateTranscendStats(rawStats, s.transcendLevel, s.knightTranscends, globalTranscends)
        return { knight: s.knight!, baseStats: boosted, targets: s.targets, weaponType: s.weaponType } satisfies KnightOptConfig
      })
      .filter((c): c is KnightOptConfig => c !== null)

    if (configs.length === 0 || importedItems.length === 0) return

    setIsOptimizing(true)
    setResults([])
    setTimeout(() => {
      try {
        const res = multiKnightOptimize(configs, importedItems)
        setResults(res)
        setActiveTab(2)
      } finally {
        setIsOptimizing(false)
      }
    }, 50)
  }

  const canOptimize = importedItems.length > 0 && slots.some(s => s.knight !== null)
  const readyCount  = slots.filter(s => s.knight !== null).length

  const tabStyle = (tab: 1 | 2): React.CSSProperties => ({
    padding: '8px 20px', fontSize: '13px', fontWeight: 'bold',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: activeTab === tab ? '#f59e0b' : '#6b7280',
    borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '48px', overflowY: 'auto' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: '95%', maxWidth: '760px', background: '#111827', border: '2px solid #f59e0b', borderRadius: '12px', marginBottom: '40px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#1e3a5f', borderRadius: '10px 10px 0 0', flexShrink: 0 }}>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>⚔️ Multi Knight Optimizer</span>
            <button onClick={onClose}
              style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#1e293b', border: 'none', color: '#9ca3af', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#9ca3af' }}
            >✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', padding: '0 20px', background: '#0f172a', flexShrink: 0 }}>
            <button style={tabStyle(1)} onClick={() => setActiveTab(1)}>1. ตั้งค่า</button>
            <button style={tabStyle(2)} onClick={() => setActiveTab(2)}>
              2. ผลลัพธ์{results.length > 0 ? ` (${results.length} knights)` : ''}
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', flex: 1 }}>

            {/* ── TAB 1: Setup ──────────────────────────────────────────── */}
            {activeTab === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* File upload */}
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 8px' }}>
                    📁 Item Pool (shared across all knights)
                  </p>
                  <JsonUploader
                    onImport={items => setImportedItems(items)}
                    onFileName={setUploadedFileName}
                  />
                  {importedItems.length > 0 && (
                    <p style={{ fontSize: '11px', color: '#22c55e', margin: '6px 0 0' }}>
                      ✅ {uploadedFileName} — {importedItems.length} items loaded
                    </p>
                  )}
                </div>

                {/* Knight slots */}
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 10px' }}>
                    ⚔️ Knights ({readyCount}/{slots.length} selected)
                  </p>
                  {slots.map((slot, idx) => (
                    <KnightSlotRow
                      key={slot.id}
                      slot={slot}
                      priority={idx + 1}
                      isFirst={idx === 0}
                      isLast={idx === slots.length - 1}
                      onSelectKnight={() => setSelectingSlotId(slot.id)}
                      onMoveUp={() => moveSlot(slot.id, -1)}
                      onMoveDown={() => moveSlot(slot.id, 1)}
                      onRemove={() => removeSlot(slot.id)}
                      onUpdate={patch => updateSlot(slot.id, patch)}
                    />
                  ))}
                  {slots.length < 3 && (
                    <button
                      onClick={addSlot}
                      style={{ width: '100%', height: '40px', borderRadius: '8px', border: '2px dashed #374151', background: 'transparent', color: '#6b7280', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#6b7280' }}
                    >
                      + เพิ่ม Knight {slots.length + 1} ({PRIORITY_BADGES[slots.length]})
                    </button>
                  )}
                </div>

                {/* Info */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                    Item pool: <span style={{ color: 'white', fontWeight: 'bold' }}>{importedItems.length}</span> items &nbsp;|&nbsp;
                    Knights ready: <span style={{ color: 'white', fontWeight: 'bold' }}>{readyCount}</span>
                  </p>
                  {readyCount > 0 && (
                    <p style={{ fontSize: '10px', color: '#4b5563', margin: '4px 0 0' }}>
                      Priority order: {slots.filter(s => s.knight).map((s, i) => `${PRIORITY_BADGES[i]} ${s.knight!.name}`).join(' → ')}
                    </p>
                  )}
                </div>

                {/* Optimize button */}
                <button
                  onClick={startOptimization}
                  disabled={!canOptimize || isOptimizing}
                  style={{
                    width: '100%', height: '48px', borderRadius: '10px',
                    fontSize: '14px', fontWeight: 'bold', border: 'none',
                    background: canOptimize && !isOptimizing
                      ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                      : '#1e293b',
                    color: canOptimize && !isOptimizing ? '#0a0c14' : '#6b7280',
                    cursor: canOptimize && !isOptimizing ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: canOptimize && !isOptimizing ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  {isOptimizing ? (
                    <>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #37414166', borderTopColor: '#6b7280', animation: 'spin 0.7s linear infinite' }} />
                      กำลังคำนวณ {readyCount} knight{readyCount > 1 ? 's' : ''}…
                    </>
                  ) : (
                    `🔍 จัดอุปกรณ์ ${readyCount} Knight${readyCount > 1 ? `s (${PRIORITY_BADGES.slice(0, readyCount).join('')})` : ''}`
                  )}
                </button>
              </div>
            )}

            {/* ── TAB 2: Results ────────────────────────────────────────── */}
            {activeTab === 2 && (
              <div>
                {results.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '13px', padding: '32px 0' }}>
                    ยังไม่มีผลลัพธ์ — กด จัดอุปกรณ์ ก่อน
                  </p>
                ) : (
                  results.map(res => <KnightResultCard key={res.priority} res={res} sourceFile={uploadedFileName} onSaveSuccess={onSaveSuccess} />)
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Knight select modal */}
      <KnightSelectModal
        isOpen={selectingSlotId !== null}
        onClose={() => setSelectingSlotId(null)}
        onSelect={handleKnightSelected}
        title="เลือกอัศวิน"
        allowAny={false}
      />
    </>
  )
}
