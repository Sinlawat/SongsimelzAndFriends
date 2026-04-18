import { useState, useEffect } from 'react'
import type {
  ParsedEquipmentItem, KnightStats, StatTarget, OptimizationResult,
  ConstraintType, EquipmentSlotType,
} from '../types/index'
import { optimizeGear } from '../utils/gearOptimizer'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  importedItems: ParsedEquipmentItem[]
  baseStats: KnightStats
  onApply: (assigned: Record<EquipmentSlotType, ParsedEquipmentItem | null>, weaponType: 'physical' | 'magic') => void
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS: StatTarget[] = [
  { stat_key: 'base_attack_physical', label: 'ATK (Physical)',    constraint: 'maximize', weight: 10 },
  { stat_key: 'base_attack_magic',    label: 'ATK (Magic)',       constraint: 'maximize', weight: 10 },
  { stat_key: 'base_speed',           label: 'Speed',             constraint: 'exactly',  target_value: 0, weight: 8 },
  { stat_key: 'base_crit_rate',       label: 'Crit Rate (%)',     constraint: 'range',    min_value: 0, max_value: 95, preferred_value: 0, weight: 9 },
  { stat_key: 'base_crit_damage',     label: 'Crit Damage (%)',   constraint: 'maximize', weight: 7 },
  { stat_key: 'base_weakness',        label: 'Weakness Hit (%)',  constraint: 'range',    min_value: 0, max_value: 50, preferred_value: 0, weight: 8 },
]

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  maximize: 'Maximize',
  minimize: 'Minimize',
  exactly:  'Exactly',
  range:    'Range',
  at_least: 'At Least',
  at_most:  'At Most',
}

const SLOT_LABELS: Record<EquipmentSlotType, string> = {
  weapon1: 'W1', weapon2: 'W2', armor1: 'A1', armor2: 'A2', ring: 'Ring',
}

const SLOT_ORDER: EquipmentSlotType[] = ['weapon1', 'weapon2', 'armor1', 'armor2', 'ring']
const RANK_BADGES = ['①', '②', '③', '④', '⑤']

// ─── Dot priority display ─────────────────────────────────────────────────────

function DotPriority({ value }: { value: number }) {
  return (
    <span style={{ letterSpacing: '-1px', fontSize: '12px' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ color: i < value ? '#f59e0b' : '#374151' }}>●</span>
      ))}
      <span style={{ color: '#6b7280', marginLeft: '4px', fontSize: '11px' }}>{value}</span>
    </span>
  )
}

// ─── Single target row ────────────────────────────────────────────────────────

function TargetRow({
  target,
  onChange,
}: {
  target: StatTarget
  onChange: (t: StatTarget) => void
}) {
  const inputStyle: React.CSSProperties = {
    width: '72px',
    background: '#0a0c14',
    border: '1px solid #374151',
    borderRadius: '6px',
    padding: '4px 8px',
    color: 'white',
    fontSize: '12px',
    outline: 'none',
  }

  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>
        {target.label}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        {/* Constraint dropdown */}
        <select
          value={target.constraint}
          onChange={e => onChange({ ...target, constraint: e.target.value as ConstraintType })}
          style={{
            background: '#1f2937', border: '1px solid #374151', borderRadius: '6px',
            padding: '4px 8px', color: '#e2e8f0', fontSize: '12px',
            cursor: 'pointer', outline: 'none',
          }}
        >
          {(Object.keys(CONSTRAINT_LABELS) as ConstraintType[]).map(c => (
            <option key={c} value={c}>{CONSTRAINT_LABELS[c]}</option>
          ))}
        </select>

        {/* Constraint-specific inputs */}
        {target.constraint === 'exactly' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
            ต้องเท่ากับ
            <input
              type="number"
              value={target.target_value ?? 0}
              onChange={e => onChange({ ...target, target_value: +e.target.value })}
              style={inputStyle}
            />
          </label>
        )}

        {(target.constraint === 'at_least' || target.constraint === 'at_most') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9ca3af' }}>
            {target.constraint === 'at_least' ? 'ไม่น้อยกว่า' : 'ไม่เกิน'}
            <input
              type="number"
              value={target.target_value ?? 0}
              onChange={e => onChange({ ...target, target_value: +e.target.value })}
              style={inputStyle}
            />
          </label>
        )}

        {target.constraint === 'range' && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
              Min
              <input
                type="number"
                value={target.min_value ?? 0}
                onChange={e => onChange({ ...target, min_value: +e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
              Max
              <input
                type="number"
                value={target.max_value ?? 0}
                onChange={e => onChange({ ...target, max_value: +e.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
              เป้าหมาย
              <input
                type="number"
                value={target.preferred_value ?? 0}
                onChange={e => onChange({ ...target, preferred_value: +e.target.value })}
                style={inputStyle}
              />
            </label>
          </>
        )}
      </div>

      {/* Priority slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>Priority:</span>
        <input
          type="range"
          min={1}
          max={10}
          value={target.weight}
          onChange={e => onChange({ ...target, weight: +e.target.value })}
          style={{ flex: 1, accentColor: '#f59e0b', cursor: 'pointer' }}
        />
        <DotPriority value={target.weight} />
      </div>
    </div>
  )
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  result,
  rank,
  targets,
  baseStats,
  onApply,
}: {
  result: OptimizationResult
  rank: number
  targets: StatTarget[]
  baseStats: KnightStats
  onApply: () => void
}) {
  const isBest = rank === 0
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)

  return (
    <div style={{
      background: '#0f172a',
      border: `1px solid ${isBest ? '#f59e0b' : '#1e293b'}`,
      borderRadius: '10px',
      padding: '14px 16px',
      marginBottom: '8px',
      overflow: 'visible',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: isBest ? '#f59e0b' : '#1e293b',
            color: isBest ? '#000' : '#f59e0b',
            border: isBest ? 'none' : '1.5px solid #f59e0b50',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 'bold',
          }}>
            {RANK_BADGES[rank]}
          </span>
          <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 'bold' }}>
            คะแนน: {result.score.toFixed(1)}%
          </span>
        </div>
        <span style={{ fontSize: '12px', color: result.meets_all_constraints ? '#22c55e' : '#f59e0b' }}>
          {result.meets_all_constraints
            ? '✅ ผ่านทุก constraint'
            : `⚠️ ไม่ผ่าน ${result.violations.length} เงื่อนไข`}
        </span>
      </div>

      {/* Equipment slots row */}
      <div style={{
        display: 'flex', gap: '6px', flexWrap: 'wrap',
        marginBottom: '10px', position: 'relative', overflow: 'visible',
      }}>
        {SLOT_ORDER.map(slotType => {
          const item = result.slots[slotType]
          const hoverKey = `${rank}-${slotType}`
          return (
            <div
              key={slotType}
              style={{ position: 'relative' }}
              onMouseEnter={() => item && setHoveredSlot(hoverKey)}
              onMouseLeave={() => setHoveredSlot(null)}
            >
              {/* Slot card */}
              <div style={{
                width: '80px',
                background: item ? '#0f172a' : '#111827',
                border: item ? '1px solid #374151' : '1px dashed #1e293b',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: item ? 'pointer' : 'default',
                minHeight: '52px',
              }}>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                  {SLOT_LABELS[slotType]}
                </div>
                {item ? (
                  <>
                    <div style={{
                      fontSize: '9px', color: 'white', fontWeight: 'bold',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis', marginBottom: '2px',
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontSize: '8px', color: '#f59e0b',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis', marginBottom: '2px',
                    }}>
                      {item.set_name ?? '—'}
                    </div>
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>
                      #{item.run_no}
                    </div>
                    <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>
                      hover ดู stat
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '9px', color: '#374151', textAlign: 'center', marginTop: '8px' }}>
                    —
                  </div>
                )}
              </div>

              {/* Stat popup */}
              {item && hoveredSlot === hoverKey && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '8px',
                  width: '220px',
                  background: '#0a0f1e',
                  border: '1px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }}>
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px', height: '10px',
                    background: '#f59e0b',
                    clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
                  }} />

                  {/* Item name + set */}
                  <div style={{
                    fontSize: '11px', color: 'white', fontWeight: 'bold',
                    marginBottom: '2px', whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.name}
                  </div>
                  {item.set_name && (
                    <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '8px' }}>
                      Set: {item.set_name}
                    </div>
                  )}

                  <div style={{ height: '1px', background: '#1e293b', marginBottom: '6px' }} />

                  {/* Main stats */}
                  <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                    Main Stats
                  </div>
                  {item.main_stats.map((stat, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '2px 0',
                    }}>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {stat.stat_name.replace(/_/g, ' ').replace('base ', '')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                        {stat.display}
                      </span>
                    </div>
                  ))}

                  {/* Sub stats */}
                  {item.sub_stats.length > 0 && (
                    <>
                      <div style={{ height: '1px', background: '#1e293b', margin: '6px 0' }} />
                      <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', marginBottom: '4px' }}>
                        Sub Stats
                      </div>
                      {item.sub_stats.map((stat, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', padding: '2px 0',
                        }}>
                          <span style={{ fontSize: '10px', color: '#6b7280' }}>
                            {stat.stat_name.replace(/_/g, ' ').replace('base ', '')}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>
                            {stat.display}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Upgrade level */}
                  <div style={{ marginTop: '6px', fontSize: '9px', color: '#374151', textAlign: 'right' }}>
                    +{item.upgrade_level}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stat comparison table */}
      <div style={{
        background: '#111827', borderRadius: '6px', overflow: 'hidden',
        border: '1px solid #1e293b', marginBottom: '10px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px auto 32px',
          padding: '4px 8px', background: '#1e293b',
          fontSize: '9px', fontWeight: 'bold', color: '#6b7280',
          gap: '4px',
        }}>
          <span>Stat</span>
          <span style={{ textAlign: 'right' }}>Base</span>
          <span style={{ textAlign: 'right' }}>+Item</span>
          <span style={{ textAlign: 'right' }}>Total</span>
          <span>Target</span>
          <span></span>
        </div>

        {targets.map((t, i) => {
          const base  = (baseStats as unknown as Record<string, number>)[t.stat_key] ?? 0
          const total = result.final_stats[t.stat_key] ?? 0
          const added = total - base
          const violated = result.violations.some(v => v.startsWith(t.label))
          const status = violated ? '❌' : '✅'
          const statusColor = violated ? '#ef4444' : '#22c55e'

          let targetLabel = ''
          switch (t.constraint) {
            case 'maximize': targetLabel = 'Maximize'; break
            case 'minimize': targetLabel = 'Minimize'; break
            case 'exactly':  targetLabel = `=${t.target_value}`; break
            case 'at_least': targetLabel = `≥${t.target_value}`; break
            case 'at_most':  targetLabel = `≤${t.target_value}`; break
            case 'range':    targetLabel = `${t.min_value}–${t.max_value}`; break
          }

          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 60px 60px auto 32px',
              padding: '5px 8px',
              gap: '4px',
              fontSize: '11px',
              borderTop: i > 0 ? '1px solid #1e293b' : undefined,
              alignItems: 'center',
            }}>
              <span style={{ color: '#9ca3af', fontSize: '10px' }}>{t.label}</span>
              <span style={{ textAlign: 'right', color: '#6b7280' }}>{Math.round(base)}</span>
              <span style={{ textAlign: 'right', color: added > 0 ? '#22c55e' : '#6b7280' }}>
                {added > 0 ? `+${Math.round(added)}` : '—'}
              </span>
              <span style={{ textAlign: 'right', color: 'white', fontWeight: 'bold' }}>
                {Math.round(total)}
              </span>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>{targetLabel}</span>
              <span style={{ color: statusColor, textAlign: 'center' }}>{status}</span>
            </div>
          )
        })}
      </div>

      {/* Violations */}
      {result.violations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {result.violations.map((v, i) => (
            <span key={i} style={{
              fontSize: '10px', color: '#fca5a5', background: '#450a0a',
              border: '1px solid #991b1b', borderRadius: '4px', padding: '2px 8px',
            }}>
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={onApply}
        style={{
          width: '100%', padding: '8px', borderRadius: '8px',
          background: 'transparent',
          border: `1.5px solid ${isBest ? '#f59e0b' : '#374151'}`,
          color: isBest ? '#f59e0b' : '#9ca3af',
          fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isBest ? '#f59e0b' : '#1f2937'
          e.currentTarget.style.color      = isBest ? '#000'     : '#e2e8f0'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color      = isBest ? '#f59e0b' : '#9ca3af'
        }}
      >
        ใช้ชุดนี้
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GearOptimizer({
  isOpen, onClose, importedItems, baseStats, onApply,
}: Props) {
  const [activeTab,     setActiveTab]     = useState<1 | 2>(1)
  const [targets,       setTargets]       = useState<StatTarget[]>(DEFAULT_TARGETS)
  const [selectedSets,  setSelectedSets]  = useState<string[]>([])
  const [weaponType,    setWeaponType]    = useState<'physical' | 'magic'>('physical')
  const [isOptimizing,  setIsOptimizing]  = useState(false)
  const [results,       setResults]       = useState<OptimizationResult[]>([])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(1)
      setTargets(DEFAULT_TARGETS)
      setSelectedSets([])
      setResults([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const availableSets = [...new Set(
    importedItems.map(i => i.set_name).filter(Boolean) as string[]
  )].sort()

  const weapons = importedItems.filter(i => i.slot_type === 'weapon').length
  const armors  = importedItems.filter(i => i.slot_type === 'armor').length
  const rings   = importedItems.filter(i => i.slot_type === 'ring').length

  const filteredCount = selectedSets.length > 0
    ? importedItems.filter(i => selectedSets.includes(i.set_name ?? '')).length
    : importedItems.length

  function updateTarget(index: number, updated: StatTarget) {
    setTargets(prev => prev.map((t, i) => i === index ? updated : t))
  }

  function startOptimization() {
    setIsOptimizing(true)
    setResults([])
    setTimeout(() => {
      try {
        const res = optimizeGear(importedItems, baseStats, targets, selectedSets, weaponType)
        setResults(res)
        setActiveTab(2)
      } finally {
        setIsOptimizing(false)
      }
    }, 50)
  }

  const tabStyle = (tab: 1 | 2): React.CSSProperties => ({
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 'bold',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: activeTab === tab ? '#f59e0b' : '#6b7280',
    borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  })

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '60px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '95%', maxWidth: '720px',
          backgroundColor: '#111827',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          overflow: 'visible',
          marginBottom: '40px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', backgroundColor: '#1e3a5f', flexShrink: 0,
          borderRadius: '10px 10px 0 0',
        }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>
            ⚙️ จัดอุปกรณ์อัตโนมัติ
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: '#1e293b', border: 'none', color: '#9ca3af',
              fontSize: '13px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#9ca3af' }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #1e293b',
          padding: '0 20px', backgroundColor: '#0f172a', flexShrink: 0,
        }}>
          <button style={tabStyle(1)} onClick={() => setActiveTab(1)}>1. ตั้งค่า</button>
          <button style={tabStyle(2)} onClick={() => setActiveTab(2)}>
            2. ผลลัพธ์{results.length > 0 ? ` (${results.length})` : ''}
          </button>
        </div>

        {/* Scrollable body — overflow visible so popups escape the container */}
        <div style={{ overflow: 'visible', padding: '20px', flex: 1 }}>

          {/* ── TAB 1: Settings ───────────────────────────────────────────── */}
          {activeTab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Section A: Set filter */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 4px' }}>
                  🎯 จำกัด Set อุปกรณ์ (optional)
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>
                  เลือก set ที่ต้องการใช้ ถ้าไม่เลือกจะค้นหาจากทุก set
                </p>
                {availableSets.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#4b5563' }}>ไม่พบ set ในข้อมูล</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {availableSets.map(s => {
                      const active = selectedSets.includes(s)
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSets(prev =>
                            active ? prev.filter(x => x !== s) : [...prev, s]
                          )}
                          style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s',
                            border: active ? '1.5px solid #f59e0b' : '1.5px solid #374151',
                            background: active ? '#1e3a5f' : '#0f172a',
                            color: active ? '#f59e0b' : '#6b7280',
                          }}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Section A2: Weapon type filter */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 6px' }}>
                  ⚔️ ประเภทอาวุธ
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { value: 'physical', label: '⚔️ กายภาพ' },
                    { value: 'magic',    label: '✨ เวทมนต์' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setWeaponType(opt.value)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: weaponType === opt.value ? '1.5px solid #f59e0b' : '1.5px solid #374151',
                        background: weaponType === opt.value ? '#1e3a5f' : 'transparent',
                        color: weaponType === opt.value ? '#f59e0b' : '#6b7280',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section B: Stat targets */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 10px' }}>
                  📊 กำหนด Stat ที่ต้องการ
                </p>
                {targets.map((t, i) => (
                  <TargetRow key={t.stat_key} target={t} onChange={updated => updateTarget(i, updated)} />
                ))}
              </div>

              {/* Section C: Summary */}
              <div style={{
                background: '#0f172a', border: '1px solid #1e293b',
                borderRadius: '8px', padding: '12px',
              }}>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px' }}>
                  อุปกรณ์ที่จะค้นหา:{' '}
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{filteredCount}</span> ชิ้น
                  <span style={{ color: '#f59e0b', marginLeft: '6px' }}>
                    ({weaponType === 'physical' ? '⚔️ กายภาพ' : '✨ เวทมนต์'} เท่านั้น)
                  </span>
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                  Weapon: {weapons} &nbsp;|&nbsp; Armor: {armors} &nbsp;|&nbsp; Ring: {rings}
                </p>
                {(weapons > 500 || armors > 500 || rings > 500) && (
                  <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '8px', marginBottom: 0 }}>
                    ⚠ อุปกรณ์มีจำนวนมาก อาจใช้เวลาสักครู่
                  </p>
                )}
              </div>

              {/* Start button */}
              <button
                onClick={startOptimization}
                disabled={isOptimizing}
                style={{
                  width: '100%', height: '48px', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 'bold',
                  background: isOptimizing
                    ? '#1e293b'
                    : 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                  color: isOptimizing ? '#6b7280' : '#0a0c14',
                  border: 'none',
                  cursor: isOptimizing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: isOptimizing ? 'none' : '0 4px 16px rgba(245,158,11,0.3)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isOptimizing) e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,158,11,0.5)'
                }}
                onMouseLeave={e => {
                  if (!isOptimizing) e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.3)'
                }}
              >
                {isOptimizing ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: '16px', height: '16px',
                      borderRadius: '50%', border: '2px solid #37414166',
                      borderTopColor: '#6b7280', animation: 'spin 0.7s linear infinite',
                    }} />
                    กำลังคำนวณ...
                  </>
                ) : '🔍 ค้นหาอุปกรณ์ที่ดีที่สุด'}
              </button>
            </div>
          )}

          {/* ── TAB 2: Results ────────────────────────────────────────────── */}
          {activeTab === 2 && (
            <div>
              {results.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '13px', padding: '32px 0' }}>
                  ยังไม่มีผลลัพธ์ — กด ค้นหาอุปกรณ์ที่ดีที่สุด ก่อน
                </p>
              ) : (
                <>
                  {/* Common-violation warning banner */}
                  {(() => {
                    const commonViolations = (results[0]?.violations ?? []).filter(v =>
                      results.every(r => r.violations.some(rv => rv.startsWith(v.split(':')[0])))
                    )
                    if (commonViolations.length === 0) return null

                    return (
                      <div style={{
                        background: '#1c0a00',
                        border: '1px solid #c2410c',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                      }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 'bold',
                          color: '#fb923c', marginBottom: '8px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                          ⚠️ ไม่พบอุปกรณ์ที่ผ่านเงื่อนไขทุกข้อ
                        </div>

                        {commonViolations.map((v, i) => {
                          // Extract stat label (before the colon)
                          const label = v.split(':')[0].trim()
                          // Find best achieved value across all results for this stat
                          const target = targets.find(t => t.label === label)
                          const bestActual = target
                            ? Math.max(...results.map(r => r.final_stats[target.stat_key] ?? 0))
                            : null

                          // Determine what was needed
                          let needed = ''
                          if (target) {
                            switch (target.constraint) {
                              case 'range':    needed = `${target.min_value}–${target.max_value}`; break
                              case 'exactly':  needed = `${target.target_value}`; break
                              case 'at_least': needed = `≥${target.target_value}`; break
                              case 'at_most':  needed = `≤${target.target_value}`; break
                            }
                          }

                          const shortfall = target && bestActual !== null && target.min_value !== undefined
                            ? target.min_value - bestActual
                            : null

                          return (
                            <div key={i} style={{ marginBottom: i < commonViolations.length - 1 ? '10px' : 0 }}>
                              <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '2px' }}>
                                ไม่พบอุปกรณ์ที่ทำให้ <strong>{label}</strong>
                                {needed ? ` ถึง ${needed}` : ''}
                              </div>
                              {bestActual !== null && (
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                  ค่าสูงสุดที่หาได้คือ{' '}
                                  <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                                    {bestActual % 1 === 0 ? bestActual : bestActual.toFixed(1)}
                                  </span>
                                  {shortfall !== null && shortfall > 0 && (
                                    <span style={{ color: '#f87171' }}>
                                      {' '}(ขาดอีก {shortfall % 1 === 0 ? shortfall : shortfall.toFixed(1)})
                                    </span>
                                  )}
                                </div>
                              )}
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                แนะนำ: เพิ่มอุปกรณ์ที่มี {label} ใน JSON หรือลด target ลง
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {results.map((result, i) => (
                    <ResultCard
                      key={i}
                      result={result}
                      rank={i}
                      targets={targets}
                      baseStats={baseStats}
                      onApply={() => { onApply(result.slots, weaponType); onClose() }}
                    />
                  ))}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
