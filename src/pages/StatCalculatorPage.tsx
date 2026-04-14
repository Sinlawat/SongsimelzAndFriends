import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import type {
  Knight, KnightStats, ItemStatBonus, Equipment, EquipmentSlotType,
  TranscendBonus,
} from '../types/index'
import { ELEMENT_ICONS, TRANSCEND_STAT_MAP, getKnightStats } from '../types/index'
import StatDisplay from '../components/StatDisplay'
import KnightEquipmentSlots from '../components/gvg/KnightEquipmentSlots'
import EquipmentPickerModal from '../components/gvg/EquipmentPickerModal'
import KnightSelectModal from '../components/gvg/KnightSelectModal'
import KnightAvatar from '../components/gvg/KnightAvatar'

// ─── Transcend calculation ────────────────────────────────────────────────────

function calculateTranscendStats(
  base: KnightStats,
  transcendLevel: number,
  knightTranscends: TranscendBonus[],
  globalTranscends: TranscendBonus[],
): KnightStats {
  if (transcendLevel === 0) return base

  const activeLevels = Array.from({ length: transcendLevel }, (_, i) => i + 1)
  const allBonuses = [
    ...knightTranscends.filter(t => activeLevels.includes(t.transcend_level)),
    ...globalTranscends.filter(t => activeLevels.includes(t.transcend_level)),
  ]

  const result = { ...base }

  allBonuses.forEach(bonus => {
    const fields = TRANSCEND_STAT_MAP[bonus.stat_name] ?? []
    fields.forEach(field => {
      const key = field as keyof KnightStats
      const baseVal = Number(base[key] ?? 0)
      const cur     = Number(result[key] ?? 0)
      ;(result as Record<string, unknown>)[key] = bonus.is_percent
        ? cur + (baseVal * bonus.value / 100)
        : cur + bonus.value
    })
  })

  return result
}

// ─── Stat row config ──────────────────────────────────────────────────────────

type StatRowKey = keyof Omit<KnightStats, 'id' | 'knight_id'>

const STAT_ROWS_CONFIG: { label: string; key: StatRowKey; pct?: boolean }[] = [
  { label: 'HP',              key: 'base_hp' },
  { label: 'ATK (Physical)',  key: 'base_attack_physical' },
  { label: 'ATK (Magic)',     key: 'base_attack_magic' },
  { label: 'DEF',             key: 'base_defense' },
  { label: 'SPD',             key: 'base_speed' },
  { label: 'CRIT Rate',       key: 'base_crit_rate',              pct: true },
  { label: 'CRIT DMG',        key: 'base_crit_damage',            pct: true },
  { label: 'Resistance',      key: 'base_resistance',             pct: true },
  { label: 'Eff. Hit Rate',   key: 'base_effective_hit_rate',     pct: true },
  { label: 'Block Rate',      key: 'base_block_rate' },
  { label: 'Weakness',        key: 'base_weakness' },
  { label: 'DMG Reduction',   key: 'base_damage_taken_reduction' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatCalculatorPage() {
  const [selectedKnight,   setSelectedKnight]   = useState<Knight | null>(null)
  const [openKnightModal,  setOpenKnightModal]  = useState(false)
  const [showStats,        setShowStats]        = useState(false)

  const [equippedItems,  setEquippedItems]  = useState<Record<EquipmentSlotType, Equipment | null>>({
    weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null,
  })
  const [openEquipSlot,  setOpenEquipSlot]  = useState<EquipmentSlotType | null>(null)
  const [itemBonuses,    setItemBonuses]    = useState<ItemStatBonus[]>([])

  const [transcendLevel,   setTranscendLevel]   = useState(0)
  const [knightTranscends, setKnightTranscends] = useState<TranscendBonus[]>([])
  const [globalTranscends, setGlobalTranscends] = useState<TranscendBonus[]>([])
  const [transcendLoaded,  setTranscendLoaded]  = useState(false)

  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedKnight) { setShowStats(false); return }
    setTranscendLevel(0)
    setTranscendLoaded(false)
    Promise.all([
      supabase.from('knight_transcend_bonuses').select('*').eq('knight_id', selectedKnight.id),
      supabase.from('global_transcend_bonuses').select('*'),
    ]).then(([{ data: kt }, { data: gt }]) => {
      setKnightTranscends(kt ?? [])
      setGlobalTranscends(gt ?? [])
      setTranscendLoaded(true)
    })
  }, [selectedKnight])

  useEffect(() => {
    const ids = Object.values(equippedItems).filter(Boolean).map(eq => eq!.id)
    if (ids.length === 0) { setItemBonuses([]); return }
    supabase
      .from('item_stat_bonuses').select('*').in('item_id', ids)
      .then(({ data }) => setItemBonuses(data ?? []))
  }, [equippedItems])

  function handleCalculate() {
    if (!selectedKnight) return
    setShowStats(true)
    setTimeout(() => statsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  // Build transcended stats for display and passing to StatDisplay
  const baseKnightStats  = selectedKnight ? getKnightStats(selectedKnight) : null
  const transcendedStats = baseKnightStats
    ? calculateTranscendStats(baseKnightStats, transcendLevel, knightTranscends, globalTranscends)
    : null

  // Knight with transcended stats injected (for StatDisplay / useStatCalculator)
  const knightForCalc: Knight | null = selectedKnight && transcendedStats
    ? { ...selectedKnight, knight_stats: transcendedStats }
    : selectedKnight

  return (
    <>
      <div
        className="relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #1a1200 0%, #0a0c14 70%)',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center px-4 py-12 sm:py-16">

          {/* Section heading */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
              <span className="text-xs text-yellow-600 tracking-widest uppercase font-semibold">Stat Calculator</span>
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
            </div>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mt-1">
              Select a knight, transcend level, and equipment to calculate final stats
            </p>
          </div>

          {/* ── Calculator card ─────────────────────────────────────────────── */}
          <div
            className="w-full max-w-2xl rounded-2xl p-1"
            style={{ background: 'linear-gradient(135deg, #f59e0b44 0%, #1e293b 40%, #1e293b 60%, #f59e0b22 100%)' }}
          >
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: '#111827' }}>

              {/* ── Knight selector ─────────────────────────────────────────── */}
              <div style={{
                background: '#111827', border: '1px solid #1e293b',
                borderRadius: '12px', padding: '20px', marginBottom: '16px',
              }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '12px' }}>
                  ⚔️ เลือกอัศวิน
                </p>

                <button
                  onClick={() => setOpenKnightModal(true)}
                  style={{
                    width: '100%', height: '56px', background: '#1f2937',
                    border: '1px solid #374151', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '0 16px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}
                >
                  {selectedKnight ? (
                    <>
                      <KnightAvatar knight={selectedKnight} size={36} showName={false} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', color: 'white', fontWeight: 'bold' }}>
                          {selectedKnight.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{selectedKnight.class}</div>
                      </div>
                      <img
                        src={ELEMENT_ICONS[selectedKnight.element]}
                        alt={selectedKnight.element}
                        style={{ width: '20px', height: '20px', objectFit: 'contain', marginLeft: 'auto' }}
                      />
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: '#374151',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                      }}>👤</div>
                      <span style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
                        * Select a knight *
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#4b5563' }}>▼</span>
                    </>
                  )}
                </button>

                {/* Base stats grid with transcend bonus overlay */}
                {selectedKnight && (() => {
                  if (!baseKnightStats) {
                    return (
                      <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        ไม่มีข้อมูล stat
                      </p>
                    )
                  }
                  return (
                    <div style={{
                      marginTop: '12px', display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                    }}>
                      {STAT_ROWS_CONFIG.map(({ label, key, pct }) => {
                        const baseVal      = Number(baseKnightStats[key] ?? 0)
                        const transcendVal = transcendedStats ? Number(transcendedStats[key] ?? 0) : baseVal
                        const bonus        = transcendVal - baseVal
                        const fmt          = (v: number) => pct ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString()
                        return (
                          <div key={label} style={{
                            background: '#0f172a', border: '1px solid #1e293b',
                            borderRadius: '8px', padding: '8px 10px',
                          }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>
                              {label}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', color: 'white', fontWeight: 'bold' }}>
                                {fmt(transcendVal)}
                              </span>
                              {bonus > 0 && (
                                <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold' }}>
                                  (+{fmt(bonus)})
                                </span>
                              )}
                            </div>
                            {bonus > 0 && (
                              <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '1px' }}>
                                Base: {fmt(baseVal)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* ── Transcend level selector ────────────────────────────────── */}
              {selectedKnight && (
                <div style={{
                  background: '#111827', border: '1px solid #1e293b',
                  borderRadius: '12px', padding: '20px', marginBottom: '16px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '12px',
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                      ✨ Transcend Level
                    </p>
                    <span style={{
                      fontSize: '13px', fontWeight: 'bold',
                      color: transcendLevel === 0 ? '#6b7280' : '#f59e0b',
                    }}>
                      {transcendLevel === 0 ? 'Base (No Transcend)' : `Transcend ${transcendLevel}`}
                    </span>
                  </div>

                  {/* Level buttons 0–12 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(lv => {
                      const isActive  = lv <= transcendLevel && lv > 0
                      const isCurrent = lv === transcendLevel
                      return (
                        <button
                          key={lv}
                          onClick={() => setTranscendLevel(lv)}
                          style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                            border: isCurrent
                              ? '2px solid #f59e0b'
                              : isActive
                              ? '1.5px solid #d97706'
                              : '1.5px solid #374151',
                            background: isCurrent ? '#f59e0b' : isActive ? '#451a03' : '#1f2937',
                            color:  isCurrent ? '#000' : isActive ? '#fbbf24' : '#6b7280',
                            transition: 'all 0.15s',
                          }}
                        >
                          {lv}
                        </button>
                      )
                    })}
                  </div>

                  {/* Active bonus preview */}
                  {transcendLevel > 0 && transcendLoaded && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px' }}>
                        Bonuses ที่ใช้งาน (Transcend 1 – {transcendLevel}):
                      </p>
                      {Array.from({ length: transcendLevel }, (_, i) => i + 1).map(lv => {
                        const allBonuses = [
                          ...knightTranscends.filter(t => t.transcend_level === lv),
                          ...globalTranscends.filter(t => t.transcend_level === lv),
                        ]
                        if (allBonuses.length === 0) return null
                        return (
                          <div key={lv} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '12px', color: '#9ca3af',
                          }}>
                            <span style={{
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: '#1e3a5f', color: '#f59e0b',
                              fontSize: '10px', fontWeight: 'bold',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {lv}
                            </span>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {allBonuses.map((b, bi) => (
                                <span key={bi} style={{ color: '#22c55e' }}>
                                  +{b.value}{b.is_percent ? '%' : ''} {b.stat_name.replace(/_/g, ' ')}
                                  {bi < allBonuses.length - 1 ? ',' : ''}
                                </span>
                              ))}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Equipment ───────────────────────────────────────────────── */}
              <div className="relative flex items-center mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
                <span className="px-3 text-xs text-gray-600 uppercase tracking-widest">Equipment</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
              </div>

              <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#0d1117', border: '1px solid #1e293b' }}>
                <KnightEquipmentSlots
                  knight={selectedKnight ?? undefined}
                  items={equippedItems}
                  onSlotClick={slot => setOpenEquipSlot(slot)}
                  readonly={false}
                />
              </div>

              {Object.values(equippedItems).some(Boolean) && (
                <div className="flex justify-center mb-3">
                  <button
                    onClick={() => setEquippedItems({ weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null })}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                    style={{ backgroundColor: '#1e293b', color: '#6b7280', border: '1px solid #2d3748' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#2d1a1a'
                      e.currentTarget.style.color = '#ef4444'
                      e.currentTarget.style.borderColor = '#ef444440'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#1e293b'
                      e.currentTarget.style.color = '#6b7280'
                      e.currentTarget.style.borderColor = '#2d3748'
                    }}
                  >
                    <span>✕</span> Reset Equipment
                  </button>
                </div>
              )}

              {/* ── Calculate button ────────────────────────────────────────── */}
              <button
                onClick={handleCalculate}
                disabled={!selectedKnight}
                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200"
                style={{
                  background: selectedKnight
                    ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                    : '#1e293b',
                  color:     selectedKnight ? '#0a0c14' : '#374151',
                  cursor:    selectedKnight ? 'pointer' : 'not-allowed',
                  boxShadow: selectedKnight ? '0 4px 24px rgba(245,158,11,0.35)' : 'none',
                }}
                onMouseEnter={e => {
                  if (selectedKnight) {
                    e.currentTarget.style.boxShadow = '0 6px 32px rgba(245,158,11,0.55)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={e => {
                  if (selectedKnight) {
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(245,158,11,0.35)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                {selectedKnight ? '⚡ Calculate Stats' : 'Select a Knight First'}
              </button>
            </div>
          </div>

          {/* ── Stats section ───────────────────────────────────────────────── */}
          <div
            ref={statsRef}
            className="w-full max-w-2xl mt-8 transition-all duration-500"
            style={{
              opacity:       showStats ? 1 : 0,
              transform:     showStats ? 'translateY(0)' : 'translateY(20px)',
              pointerEvents: showStats ? 'all' : 'none',
            }}
          >
            {showStats && knightForCalc && (
              <StatDisplay character={knightForCalc} itemBonuses={itemBonuses} />
            )}
          </div>

        </div>
      </div>

      {/* Knight select modal */}
      <KnightSelectModal
        isOpen={openKnightModal}
        onClose={() => setOpenKnightModal(false)}
        onSelect={knight => {
          setSelectedKnight(knight)
          setOpenKnightModal(false)
          setEquippedItems({ weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null })
        }}
        title="Select a Knight"
        allowAny={false}
      />

      {/* Equipment picker modal */}
      {openEquipSlot && (
        <EquipmentPickerModal
          isOpen={!!openEquipSlot}
          slotType={openEquipSlot}
          currentEquipmentId={equippedItems[openEquipSlot]?.id}
          onSelect={eq => {
            setEquippedItems(prev => ({ ...prev, [openEquipSlot]: eq }))
            setOpenEquipSlot(null)
          }}
          onClose={() => setOpenEquipSlot(null)}
        />
      )}
    </>
  )
}
