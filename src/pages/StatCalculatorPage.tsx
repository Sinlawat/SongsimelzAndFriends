import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabaseClient'
import {
  getSavedSets, saveSet, deleteSavedSet,
} from '../lib/savedSets'
import type { SavedSet, SavedSetItem } from '../lib/savedSets'
import type {
  Knight, KnightStats, Equipment, EquipmentSlotType,
  TranscendBonus, ParsedEquipmentItem,
} from '../types/index'
import { ELEMENT_ICONS, getKnightStats, FLAT_PERCENT_STATS, EQUIPMENT_SLOTS } from '../types/index'
import KnightEquipmentSlots from '../components/gvg/KnightEquipmentSlots'
import EquipmentPickerModal from '../components/gvg/EquipmentPickerModal'
import KnightSelectModal from '../components/gvg/KnightSelectModal'
import KnightAvatar from '../components/gvg/KnightAvatar'
import JsonUploader from '../components/JsonUploader'
import ImportedEquipmentList, { STAT_DISPLAY } from '../components/ImportedEquipmentList'
import GearOptimizer from '../components/GearOptimizer'
import MultiKnightOptimizer from '../components/MultiKnightOptimizer'
import { calculateTranscendStats } from '../utils/transcendStats'
import { useAuth } from '../contexts/AuthContext'

// ─── Imported item bonus calculation ─────────────────────────────────────────

function calcImportedItemBonus(
  assignedItems: Record<EquipmentSlotType, ParsedEquipmentItem | null>,
  baseStats: KnightStats,
): Record<string, number> {
  const bonus: Record<string, number> = {}

  Object.values(assignedItems).forEach(item => {
    if (!item) return

    const allStats = [...item.main_stats, ...item.sub_stats]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allStats.forEach((stat: any) => {
      const key = stat.stat_name

      if (key === 'all_attack') {
        const physBase = baseStats.base_attack_physical ?? 0
        const magBase  = baseStats.base_attack_magic    ?? 0
        if (stat.is_percent) {
          bonus['base_attack_physical'] = (bonus['base_attack_physical'] ?? 0) + (physBase * stat.value / 100)
          bonus['base_attack_magic']    = (bonus['base_attack_magic']    ?? 0) + (magBase  * stat.value / 100)
        } else {
          bonus['base_attack_physical'] = (bonus['base_attack_physical'] ?? 0) + stat.value
          bonus['base_attack_magic']    = (bonus['base_attack_magic']    ?? 0) + stat.value
        }
        return
      }

      if (!(key in baseStats) && !FLAT_PERCENT_STATS.has(key)) return

      const baseVal = (baseStats as unknown as Record<string, number>)[key] ?? 0

      if (stat.is_percent) {
        // percent of base — e.g. "HP (%)" → multiply
        bonus[key] = (bonus[key] ?? 0) + (baseVal * stat.value / 100)
      } else if (stat.is_flat_percent) {
        // flat percentage point — e.g. "Crit Rate 4%" → add directly
        bonus[key] = (bonus[key] ?? 0) + stat.value
      } else {
        // flat number — e.g. "Speed 12" → add directly
        bonus[key] = (bonus[key] ?? 0) + stat.value
      }
    })
  })

  return bonus
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
  { label: 'Block Rate',      key: 'base_block_rate',             pct: true },
  { label: 'Weakness',        key: 'base_weakness',               pct: true },
  { label: 'DMG Reduction',   key: 'base_damage_taken_reduction', pct: true },
]


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatCalculatorPage() {
  const { user } = useAuth()

  const [loginWarning,     setLoginWarning]     = useState(false)
  const [selectedKnight,   setSelectedKnight]   = useState<Knight | null>(null)
  const [openKnightModal,  setOpenKnightModal]  = useState(false)

  const [equippedItems,  setEquippedItems]  = useState<Record<EquipmentSlotType, Equipment | null>>({
    weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null,
  })
  const [openEquipSlot,  setOpenEquipSlot]  = useState<EquipmentSlotType | null>(null)

  const [transcendLevel,   setTranscendLevel]   = useState(0)
  const [knightTranscends, setKnightTranscends] = useState<TranscendBonus[]>([])
  const [globalTranscends, setGlobalTranscends] = useState<TranscendBonus[]>([])
  const [transcendLoaded,  setTranscendLoaded]  = useState(false)

  const [importedItems,         setImportedItems]         = useState<ParsedEquipmentItem[]>([])
  const [uploadedFileName,      setUploadedFileName]      = useState<string | null>(null)
  const [showImported,          setShowImported]          = useState(false)
  const [assignedImportedItems, setAssignedImportedItems] = useState<Record<EquipmentSlotType, ParsedEquipmentItem | null>>({
    weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null,
  })
  const [showOptimizer,         setShowOptimizer]         = useState(false)
  const [showMultiOptimizer,    setShowMultiOptimizer]    = useState(false)
  const [equipmentImages,       setEquipmentImages]       = useState<Record<EquipmentSlotType, string | null>>({
    weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null,
  })
  const [imagesLoading,         setImagesLoading]         = useState(false)
  const [selectedWeaponType,    setSelectedWeaponType]    = useState<'physical' | 'magic'>('physical')

  const [savedSets,        setSavedSets]        = useState<SavedSet[]>([])
  const [hoveredBadgeKey,  setHoveredBadgeKey]  = useState<string | null>(null)
  const [tooltipPos,       setTooltipPos]       = useState({ top: 0, left: 0 })
  const [tooltipData,      setTooltipData]      = useState<{ run_no: number; set_name: string | null; mainStats: { name: string; value: string }[]; subStats: { name: string; value: string }[] } | null>(null)

  const savedSetsRef = useRef<HTMLDivElement>(null)

  // Load saved sets from Supabase on mount
  const fetchSavedSets = () => getSavedSets().then(sets => setSavedSets(sets))
  useEffect(() => { fetchSavedSets() }, [])

  useEffect(() => {
    if (!selectedKnight) return
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

  // Fetch equipment images from DB whenever assigned imported items change
  useEffect(() => {
    const hasAny = Object.values(assignedImportedItems).some(v => v !== null)
    if (!hasAny) {
      setEquipmentImages({ weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null })
      return
    }
    setImagesLoading(true)
    const fetchImages = async () => {
      const newImages: Record<EquipmentSlotType, string | null> = {
        weapon1: null, weapon2: null, armor1: null, armor2: null, ring: null,
      }
      await Promise.all(
        EQUIPMENT_SLOTS.map(async slot => {
          const assigned = assignedImportedItems[slot.type]
          if (!assigned?.set_name) return
          let query = supabase
            .from('equipment')
            .select('image_url')
            .eq('slot_type', slot.equipType)
            .eq('set_name', assigned.set_name)
          if (slot.equipType === 'weapon') {
            query = query.eq('equip_type', selectedWeaponType)
          }
          const { data } = await query.limit(1).maybeSingle()
          if (data?.image_url) newImages[slot.type] = data.image_url
        })
      )
      setEquipmentImages(newImages)
      setImagesLoading(false)
    }
    fetchImages()
  }, [assignedImportedItems, selectedWeaponType])

  async function handleSaveSet() {
    if (!user) { setLoginWarning(true); return }
    setLoginWarning(false)
    if (!selectedKnight) return
    const setNames = [
      ...Object.values(equippedItems).map(e => e?.set_name),
      ...Object.values(assignedImportedItems).map(i => i?.set_name),
    ].filter((s): s is string => !!s)
    const uniqueSets = [...new Set(setNames)]
    const equipment_items: SavedSetItem[] = EQUIPMENT_SLOTS
      .map(slot => assignedImportedItems[slot.type])
      .filter((item): item is ParsedEquipmentItem => item !== null)
      .map(item => ({
        run_no:            item.run_no,
        slot_type:         item.slot_type,
        name:              item.name,
        set_name:          item.set_name ?? null,
        main_stat_display: item.main_stats.map(s => `${STAT_DISPLAY[s.stat_name] ?? s.stat_name}: ${s.display}`).join(', '),
        main_stats: item.main_stats.map(s => ({ name: STAT_DISPLAY[s.stat_name] ?? s.stat_name, value: s.display })),
        sub_stats:  item.sub_stats.map(s  => ({ name: STAT_DISPLAY[s.stat_name]  ?? s.stat_name,  value: s.display  })),
      }))
    const saved = await saveSet({
      knight_name:     selectedKnight.name,
      set_name:        uniqueSets.join(', '),
      source_file:     uploadedFileName,
      equipment_items,
    })
    if (saved) {
      setSavedSets(prev => [saved, ...prev])
      setTimeout(() => savedSetsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }

  async function deleteSet(id: string) {
    await deleteSavedSet(id)
    setSavedSets(prev => prev.filter(s => s.id !== id))
  }

  // Build transcended stats for display and passing to StatDisplay
  const baseKnightStats  = selectedKnight ? getKnightStats(selectedKnight) : null
  const transcendedStats = baseKnightStats
    ? calculateTranscendStats(baseKnightStats, transcendLevel, knightTranscends, globalTranscends)
    : null

  // Imported item bonuses (per stat key → flat bonus value)
  const importedBonus = baseKnightStats
    ? calcImportedItemBonus(assignedImportedItems, baseKnightStats)
    : {}


  // Merge assigned imported items with fetched images into Equipment-shaped objects
  const equippedForDisplay: Record<EquipmentSlotType, Equipment | null> =
    Object.fromEntries(
      EQUIPMENT_SLOTS.map(slot => {
        // Prefer DB-assigned equipment; fall back to imported item representation
        if (equippedItems[slot.type]) return [slot.type, equippedItems[slot.type]]
        const imported = assignedImportedItems[slot.type]
        if (!imported) return [slot.type, null]
        const eq: Equipment = {
          id:        `imported-${imported.run_no}-${slot.type}`,
          name:      imported.name,
          slot_type: slot.equipType,
          set_name:  imported.set_name ?? undefined,
          image_url: equipmentImages[slot.type] ?? undefined,
        }
        return [slot.type, eq]
      })
    ) as Record<EquipmentSlotType, Equipment | null>

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
                        const baseVal       = Number(baseKnightStats[key] ?? 0)
                        const transcendVal  = transcendedStats ? Number(transcendedStats[key] ?? 0) : baseVal
                        const transcendBns  = transcendVal - baseVal
                        const itemBns       = importedBonus[key] ?? 0
                        const total         = transcendVal + itemBns
                        const fmt           = (v: number) => pct ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString()
                        const anyBonus      = transcendBns > 0 || itemBns > 0
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
                                {fmt(total)}
                              </span>
                              {transcendBns > 0 && (
                                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold' }}>
                                  (+{fmt(transcendBns)})
                                </span>
                              )}
                              {itemBns > 0 && (
                                <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold' }}>
                                  (+{fmt(itemBns)} items)
                                </span>
                              )}
                            </div>
                            {anyBonus && (
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
                  items={equippedForDisplay}
                  onSlotClick={slot => setOpenEquipSlot(slot)}
                  readonly={false}
                  imagesLoading={imagesLoading}
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

              {/* ── JSON Import ─────────────────────────────────────────────── */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '10px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>
                    📂 นำเข้าอุปกรณ์จาก JSON
                  </span>
                  {importedItems.length > 0 && (
                    <button
                      onClick={() => setShowImported(p => !p)}
                      style={{
                        fontSize: '11px', padding: '4px 12px',
                        borderRadius: '6px', border: '1px solid #374151',
                        background: 'transparent', color: '#9ca3af',
                        cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#e2e8f0' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af' }}
                    >
                      {showImported ? 'ซ่อน' : `ดูอุปกรณ์ (${importedItems.length})`}
                    </button>
                  )}
                </div>

                <JsonUploader
                  onImport={items => {
                    setImportedItems(items)
                    setShowImported(true)
                    setAssignedImportedItems({
                      weapon1: null, weapon2: null,
                      armor1:  null, armor2:  null, ring: null,
                    })
                  }}
                  onFileName={setUploadedFileName}
                />

                {showImported && importedItems.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <ImportedEquipmentList
                      items={importedItems}
                      assignedItems={assignedImportedItems}
                      onAssign={(slotType, item) =>
                        setAssignedImportedItems(prev => ({ ...prev, [slotType]: item }))
                      }
                      onOptimize={() => setShowOptimizer(true)}
                    />
                  </div>
                )}
              </div>

              {/* ── บันทึกเซ็ท button ───────────────────────────────────────── */}
              <button
                onClick={handleSaveSet}
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
                {selectedKnight ? '💾 บันทึกเซ็ท' : 'เลือกอัศวินก่อน'}
              </button>

              {loginWarning && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#2d1a1a',
                  border: '1px solid #ef444466',
                  color: '#fca5a5',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                  ⚠️ กรุณา Login ก่อนบันทึกเซ็ท
                </div>
              )}
            </div>
          </div>

          {/* ── Multi Knight Optimizer button ────────────────────────────────── */}
          <div className="w-full max-w-2xl mt-4 flex justify-center">
            <button
              onClick={() => setShowMultiOptimizer(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200"
              style={{ background: '#1e293b', color: '#f59e0b', border: '1.5px solid #f59e0b44' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e3a5f'; e.currentTarget.style.borderColor = '#f59e0b' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#f59e0b44' }}
            >
              ⚔️ Multi Knight Optimizer
            </button>
          </div>

          {/* ── Saved sets panel ─────────────────────────────────────────────── */}
          <div ref={savedSetsRef} className="w-full max-w-2xl mt-8">
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e94560' }}>
                💾 เซ็ทที่บันทึกไว้ {savedSets.length > 0 ? `(${savedSets.length})` : ''}
              </span>
              {savedSets.length > 0 && (
                <button
                  onClick={async () => {
                    await Promise.all(savedSets.map(s => deleteSavedSet(s.id)))
                    setSavedSets([])
                  }}
                  style={{
                    fontSize: '10px', color: '#6b7280', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 8px',
                    borderRadius: '4px', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6b7280' }}
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>

            {savedSets.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#374151', textAlign: 'center', padding: '24px 0' }}>
                ยังไม่มีเซ็ทที่บันทึก
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedSets.map(s => (
                  <div
                    key={s.id}
                    style={{
                      background: '#0f172a',
                      borderLeft: '4px solid #e94560',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Card header row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px',
                      borderBottom: '1px solid #1e293b',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.knight_name}
                        </span>
                        {s.source_file && (
                          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.source_file}
                          </span>
                        )}
                      </span>
                      {s.set_name && (
                        <span style={{ fontSize: '9px', color: '#4b5563', flexShrink: 0 }}>
                          {s.set_name}
                        </span>
                      )}
                      <button
                        onClick={() => deleteSet(s.id)}
                        style={{
                          fontSize: '11px', color: '#4b5563', background: 'none',
                          border: 'none', cursor: 'pointer', padding: '2px 6px',
                          borderRadius: '4px', transition: 'color 0.15s, background 0.15s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#2d1a1a' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'none' }}
                      >
                        ลบ
                      </button>
                    </div>


                    {/* Equipment items list */}
                    {(s.equipment_items?.length ?? 0) > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 14px 12px' }}>
                        {(s.equipment_items ?? []).map((item, idx) => {
                          const badgeKey = `${s.id}-${item.run_no}`
                          return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* run_no badge — tooltip rendered via portal */}
                            <span
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '28px', height: '20px',
                                background: '#e94560', borderRadius: '5px',
                                fontSize: '11px', fontWeight: 'bold', color: '#fff',
                                padding: '0 4px', cursor: 'default', flexShrink: 0,
                              }}
                              onMouseEnter={e => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setTooltipPos({ top: rect.top - 8, left: rect.left })
                                setTooltipData({
                                  run_no:    item.run_no,
                                  set_name:  item.set_name,
                                  mainStats: item.main_stats ?? [],
                                  subStats:  item.sub_stats  ?? [],
                                })
                                setHoveredBadgeKey(badgeKey)
                              }}
                              onMouseLeave={() => setHoveredBadgeKey(null)}
                            >
                              {item.run_no}
                            </span>
                            {/* item name */}
                            <span style={{
                              fontSize: '12px', color: '#e2e8f0', fontWeight: 'bold',
                              flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.name}
                            </span>
                            {/* main stat */}
                            {item.main_stat_display && (
                              <span style={{ fontSize: '10px', color: '#6b7280', flexShrink: 0 }}>
                                {item.main_stat_display}
                              </span>
                            )}
                          </div>
                        )})}
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: '#374151', padding: '8px 14px 12px', margin: 0 }}>
                        ไม่มีข้อมูลอุปกรณ์
                      </p>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Gear optimizer modal */}
      {showOptimizer && baseKnightStats && (
        <GearOptimizer
          isOpen={showOptimizer}
          onClose={() => setShowOptimizer(false)}
          importedItems={importedItems}
          baseStats={transcendedStats ?? baseKnightStats}
          onApply={(assigned, wt) => {
            setAssignedImportedItems(assigned)
            setSelectedWeaponType(wt)
            setShowOptimizer(false)
          }}
        />
      )}

      {/* Multi Knight Optimizer modal */}
      <MultiKnightOptimizer
        isOpen={showMultiOptimizer}
        onClose={() => setShowMultiOptimizer(false)}
        onSaveSuccess={fetchSavedSets}
      />

      {/* Badge tooltip — portalled to body so it's never clipped */}
      {hoveredBadgeKey && tooltipData && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: 'translateY(-100%)',
          zIndex: 9999,
          width: '220px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '11px',
          color: '#e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          lineHeight: '1.6',
        }}>
          <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>#{tooltipData.run_no}</div>
          {tooltipData.set_name && (
            <div style={{ color: '#f59e0b', marginBottom: '6px' }}>Set: {tooltipData.set_name}</div>
          )}
          {tooltipData.mainStats.length > 0 && (
            <>
              <div style={{ color: '#94a3b8', marginBottom: '2px' }}>Main Stat:</div>
              {tooltipData.mainStats.map((s, i) => (
                <div key={i} style={{ paddingLeft: '8px' }}>• {s.name}: {s.value}</div>
              ))}
            </>
          )}
          {tooltipData.subStats.length > 0 && (
            <>
              <div style={{ color: '#94a3b8', marginTop: '4px', marginBottom: '2px' }}>Sub Stats:</div>
              {tooltipData.subStats.map((s, i) => (
                <div key={i} style={{ paddingLeft: '8px' }}>• {s.name}: {s.value}</div>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
