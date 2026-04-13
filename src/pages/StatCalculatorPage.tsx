import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Character, Item, EquippedItems, SlotType } from '../types/index'
import StatDisplay from '../components/StatDisplay'
import ItemModal from '../components/ItemModal'
import GradeBadge, { GRADE_META_MAP } from '../components/GradeBadge'

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOTS: { type: SlotType; label: string; icon: string; color: string }[] = [
  { type: 'weapon',    label: 'Weapon',    icon: '⚔️', color: '#ef4444' },
  { type: 'armor',     label: 'Armor',     icon: '🛡️', color: '#3b82f6' },
  { type: 'accessory', label: 'Accessory', icon: '💍', color: '#a855f7' },
  { type: 'gem',       label: 'Gem',       icon: '💎', color: '#22c55e' },
]

const GRADE_COLORS: Record<Item['grade'], string> = Object.fromEntries(
  Object.entries(GRADE_META_MAP).map(([k, v]) => [k, v.color])
) as Record<Item['grade'], string>

const ELEMENT_COLORS: Record<string, string> = {
  Fire:  '#ef4444',
  Water: '#3b82f6',
  Wind:  '#22c55e',
  Light: '#fde68a',
  Dark:  '#a855f7',
  Earth: '#a16207',
}

// ─── Slot Selector Button ─────────────────────────────────────────────────────

interface SlotButtonProps {
  slotConfig: typeof SLOTS[number]
  equipped: Item | null
  onClick: () => void
}

function SlotButton({ slotConfig, equipped, onClick }: SlotButtonProps) {
  const [hovered, setHovered] = useState(false)
  const gradeColor = equipped ? GRADE_COLORS[equipped.grade] : null

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-xl p-3 transition-all duration-200 flex items-center gap-3"
      style={{
        backgroundColor: '#0d1117',
        border: `1px solid ${hovered || equipped ? (gradeColor ?? slotConfig.color) : '#1e293b'}`,
        boxShadow: (hovered || equipped) ? `0 0 14px ${(gradeColor ?? slotConfig.color)}28` : 'none',
      }}
    >
      {/* Icon box */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-all duration-200"
        style={{
          backgroundColor: `${slotConfig.color}18`,
          border: `1px solid ${slotConfig.color}40`,
          boxShadow: hovered ? `0 0 10px ${slotConfig.color}30` : 'none',
        }}
      >
        {slotConfig.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: slotConfig.color }}>
          {slotConfig.label}
        </p>
        {equipped ? (
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: gradeColor ?? '#e2e8f0' }}>
              {equipped.name}
            </p>
            <GradeBadge grade={equipped.grade} />
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-0.5">Select item...</p>
        )}
      </div>

      {/* Arrow */}
      <span
        className="text-xs flex-shrink-0 transition-transform duration-200"
        style={{ color: '#4b5563', transform: hovered ? 'rotate(-180deg)' : 'rotate(0deg)' }}
      >
        ▾
      </span>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatCalculatorPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [items, setItems]           = useState<Item[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [equippedItems, setEquippedItems] = useState<EquippedItems>({
    weapon: null, armor: null, accessory: null, gem: null,
  })
  const [itemModalSlot, setItemModalSlot] = useState<SlotType | null>(null)
  const [showStats, setShowStats]         = useState(false)

  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      const [charsRes, itemsRes] = await Promise.all([
        supabase.from('characters').select('*').order('name'),
        supabase.from('items').select('*, item_stat_bonuses(*)').order('name'),
      ])
      if (charsRes.error || itemsRes.error) {
        setError(charsRes.error?.message ?? itemsRes.error?.message ?? 'Failed to load data')
        setLoading(false)
        return
      }
      setCharacters(charsRes.data ?? [])
      setItems((itemsRes.data as Item[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!selectedCharacter) setShowStats(false)
  }, [selectedCharacter])

  function handleEquip(item: Item) {
    if (!itemModalSlot) return
    setEquippedItems(prev => ({ ...prev, [itemModalSlot]: item }))
    setItemModalSlot(null)
  }

  function handleUnequip() {
    if (!itemModalSlot) return
    setEquippedItems(prev => ({ ...prev, [itemModalSlot]: null }))
    setItemModalSlot(null)
  }

  function handleReset() {
    setEquippedItems({ weapon: null, armor: null, accessory: null, gem: null })
  }

  function handleCalculate() {
    if (!selectedCharacter) return
    setShowStats(true)
    setTimeout(() => statsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const modalItems    = itemModalSlot ? items.filter(i => i.slot_type === itemModalSlot) : []
  const selectedChar  = characters.find(c => c.id === selectedCharacter?.id) ?? null
  const elementColor  = selectedChar ? (ELEMENT_COLORS[selectedChar.element] ?? '#9ca3af') : '#9ca3af'

  return (
    <>
      {/* ── Hero background ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #1a1200 0%, #0a0c14 70%)',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* Decorative grid lines */}
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
              Select a character and equipment to calculate final stats
            </p>
          </div>

          {/* Main card */}
          {loading ? (
            // ── Loading skeleton ──────────────────────────────────────────────
            <div
              className="w-full max-w-2xl rounded-2xl p-1"
              style={{ background: 'linear-gradient(135deg, #f59e0b22 0%, #1e293b 40%, #1e293b 60%, #f59e0b11 100%)' }}
            >
              <div className="rounded-2xl p-6 sm:p-8 space-y-4" style={{ backgroundColor: '#111827' }}>
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: '#1e2d47' }} />
                  <div className="h-11 w-full rounded-xl animate-pulse" style={{ backgroundColor: '#0d1117', border: '1px solid #1e2d47' }} />
                  <div className="h-7 w-48 rounded-lg animate-pulse" style={{ backgroundColor: '#1e2d47' }} />
                </div>
                <div className="h-px w-full animate-pulse" style={{ backgroundColor: '#1e2d47' }} />
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="h-16 rounded-xl animate-pulse"
                      style={{ backgroundColor: '#0d1117', border: '1px solid #1e2d47', animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <div className="h-4 w-28 rounded animate-pulse mx-auto" style={{ backgroundColor: '#1e2d47' }} />
                <div className="h-12 w-full rounded-xl animate-pulse" style={{ backgroundColor: '#1e2d47' }} />
              </div>
            </div>
          ) : error ? (
            // ── Error ─────────────────────────────────────────────────────────
            <div
              className="w-full max-w-lg rounded-xl border p-6 text-center"
              style={{ backgroundColor: '#111827', borderColor: '#7f1d1d' }}
            >
              <p className="text-red-400 font-semibold">Connection Error</p>
              <p className="text-red-500 text-sm mt-1 opacity-80">{error}</p>
              <p className="text-gray-600 text-xs mt-2">Check .env.local Supabase credentials</p>
            </div>
          ) : (
            // ── Calculator card ───────────────────────────────────────────────
            <div
              className="w-full max-w-2xl rounded-2xl p-1"
              style={{ background: 'linear-gradient(135deg, #f59e0b44 0%, #1e293b 40%, #1e293b 60%, #f59e0b22 100%)' }}
            >
              <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: '#111827' }}>

                {/* Character selector */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-2" style={{ color: '#f59e0b' }}>
                    <span>🧙</span> Hero
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-sm z-10"
                      style={{
                        backgroundColor: selectedChar ? `${elementColor}20` : '#1e293b',
                        border: `1px solid ${selectedChar ? elementColor + '50' : '#2d3748'}`,
                      }}
                    >
                      {selectedChar ? '🧙' : '👤'}
                    </div>
                    <select
                      className="w-full rounded-xl pl-12 pr-10 py-3 text-sm font-semibold appearance-none cursor-pointer focus:outline-none transition-all duration-200"
                      style={{
                        backgroundColor: '#0d1117',
                        border: `1px solid ${selectedChar ? elementColor + '60' : '#1e293b'}`,
                        color: selectedChar ? '#e2e8f0' : '#6b7280',
                        boxShadow: selectedChar ? `0 0 14px ${elementColor}18` : 'none',
                      }}
                      value={selectedCharacter?.id ?? ''}
                      onChange={e => {
                        const found = characters.find(c => c.id === e.target.value) ?? null
                        setSelectedCharacter(found)
                      }}
                    >
                      <option value="">— Choose your hero —</option>
                      {characters.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.class} · {c.element}
                        </option>
                      ))}
                    </select>
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                      style={{ color: '#4b5563' }}
                    >
                      ▾
                    </span>
                  </div>

                  {/* Character badge */}
                  {selectedChar && (
                    <div
                      className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: `${elementColor}10`, border: `1px solid ${elementColor}30` }}
                    >
                      <span className="text-xs font-bold" style={{ color: elementColor }}>{selectedChar.element}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-xs text-gray-400">{selectedChar.class}</span>
                      <span className="text-gray-600 text-xs">·</span>
                      <span className="text-xs text-gray-500">{selectedChar.base_hp.toLocaleString()} HP base</span>
                    </div>
                  )}
                </div>

                {/* Equipment divider */}
                <div className="relative flex items-center mb-6">
                  <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
                  <span className="px-3 text-xs text-gray-600 uppercase tracking-widest">Equipment</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#1e293b' }} />
                </div>

                {/* Equipment 2×2 grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {SLOTS.map(slot => (
                    <SlotButton
                      key={slot.type}
                      slotConfig={slot}
                      equipped={equippedItems[slot.type]}
                      onClick={() => setItemModalSlot(slot.type)}
                    />
                  ))}
                </div>

                {/* Reset button (only when any slot is equipped) */}
                {Object.values(equippedItems).some(Boolean) && (
                  <div className="flex justify-center mb-3">
                    <button
                      onClick={handleReset}
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

                {/* Calculate button */}
                <button
                  onClick={handleCalculate}
                  disabled={!selectedCharacter}
                  className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200"
                  style={{
                    background: selectedCharacter
                      ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                      : '#1e293b',
                    color: selectedCharacter ? '#0a0c14' : '#374151',
                    cursor: selectedCharacter ? 'pointer' : 'not-allowed',
                    boxShadow: selectedCharacter ? '0 4px 24px rgba(245,158,11,0.35)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (selectedCharacter) {
                      e.currentTarget.style.boxShadow = '0 6px 32px rgba(245,158,11,0.55)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedCharacter) {
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(245,158,11,0.35)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  {selectedCharacter ? '⚡ Calculate Stats' : 'Select a Hero First'}
                </button>
              </div>
            </div>
          )}

          {/* Stats section (slides in after calculate) */}
          <div
            ref={statsRef}
            className="w-full max-w-2xl mt-8 transition-all duration-500"
            style={{
              opacity: showStats ? 1 : 0,
              transform: showStats ? 'translateY(0)' : 'translateY(20px)',
              pointerEvents: showStats ? 'all' : 'none',
            }}
          >
            {showStats && selectedChar && (
              <StatDisplay character={selectedChar} equippedItems={equippedItems} />
            )}
          </div>

        </div>
      </div>

      {/* Item selection modal */}
      {itemModalSlot && (
        <ItemModal
          slotType={itemModalSlot}
          items={modalItems}
          currentItem={equippedItems[itemModalSlot]}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onClose={() => setItemModalSlot(null)}
        />
      )}
    </>
  )
}
