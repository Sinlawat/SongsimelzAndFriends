import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Knight, KnightElement } from '../../types/index'
import { ELEMENT_COLORS, ELEMENT_ICONS } from '../../types/index'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (knight: Knight) => void
  title: string
  allowAny?: boolean
}

type ElementFilter = KnightElement | 'all'

const ELEMENTS: KnightElement[] = ['magic', 'physical', 'tank', 'support', 'balance']

const GRADES = ['gold++', 'gold+', 'gold', 'blue', 'green', 'white'] as const
type Grade = typeof GRADES[number]

const GRADE_COLORS: Record<string, string> = {
  'gold++': '#f59e0b',
  'gold+':  '#fbbf24',
  'gold':   '#d97706',
  'blue':   '#3b82f6',
  'green':  '#22c55e',
  'white':  '#e2e8f0',
}

const GRADE_BG: Record<string, string> = {
  'gold++': '#451a03',
  'gold+':  '#3d2200',
  'gold':   '#2d1a00',
  'blue':   '#1e3a5f',
  'green':  '#14532d',
  'white':  '#1f2937',
}

const GRADE_SORT: Record<string, number> = {
  'gold++': 0,
  'gold+':  1,
  'gold':   2,
  'blue':   3,
  'green':  4,
  'white':  5,
}

// ─── Knight card ─────────────────────────────────────────────────────────────

interface KnightCardProps {
  knight: Knight
  onClick: () => void
}

function KnightCard({ knight, onClick }: KnightCardProps) {
  const [hovered, setHovered] = useState(false)
  const color = ELEMENT_COLORS[knight.element]

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#1f2937',
        border: `1.5px solid ${hovered ? '#f59e0b' : '#374151'}`,
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        padding: 0,
      }}
    >
      {/* Image or fallback — both position:absolute to fill the card */}
      {knight.image_url ? (
        <img
          src={knight.image_url}
          alt={knight.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: color + '22',
          fontSize: '1.75rem',
          fontWeight: 'bold',
          color,
        }}>
          {knight.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name overlay — gradient bar at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 4px 5px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
      }}>
        {/* Knight name */}
        <div style={{
          fontSize: '10px',
          color: 'white',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {knight.name}
        </div>
      </div>
    </button>
  )
}

// ─── "ANY" card ───────────────────────────────────────────────────────────────

interface AnyCardProps {
  onClick: () => void
}

function AnyCard({ onClick }: AnyCardProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#1f2937',
        border: `1.5px solid ${hovered ? '#f59e0b' : '#374151'}`,
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        padding: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.75rem',
      }}>
        ⭐
      </div>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 4px 5px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        fontSize: '10px',
        color: '#9ca3af',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        ANY
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function KnightSelectModal({ isOpen, onClose, onSelect, title, allowAny = false }: Props) {
  const [knights, setKnights]       = useState<Knight[]>([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [elementFilter, setElementFilter] = useState<ElementFilter>('all')
  const [gradeFilters, setGradeFilters] = useState<Grade[]>([])

  const overlayRef = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  // Fetch knights once on first open
  const fetched = useRef(false)
  useEffect(() => {
    if (!isOpen || fetched.current) return
    setLoading(true)
    supabase
      .from('knights')
      .select(`
        id,
        name,
        element,
        class,
        grade,
        image_url,
        img_skill_1,
        img_skill_2,
        knight_stats (
          base_hp,
          base_attack_physical,
          base_attack_magic,
          base_defense,
          base_speed,
          base_crit_rate,
          base_crit_damage,
          base_resistance,
          base_effective_hit_rate,
          base_block_rate,
          base_weakness,
          base_damage_taken_reduction
        )
      `)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setKnights(data as Knight[])
          fetched.current = true
        }
        setLoading(false)
      })
  }, [isOpen])

  // Reset filters & focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setElementFilter('all')
      setGradeFilters([])
      setTimeout(() => searchRef.current?.focus(), 80)
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])


  const toggleGrade = (grade: Grade) => {
    setGradeFilters(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    )
  }

  // Client-side filtering
  const filtered = useMemo(() => {
    return knights
      .filter(k => {
        const matchElement = elementFilter === 'all' || k.element === elementFilter
        const matchGrade   = gradeFilters.length === 0 || gradeFilters.includes(k.grade as Grade)
        const matchSearch  = k.name.toLowerCase().includes(search.toLowerCase())
        return matchElement && matchGrade && matchSearch
      })
      .sort((a, b) => {
        const gradeDiff = (GRADE_SORT[a.grade ?? 'white'] ?? 99) - (GRADE_SORT[b.grade ?? 'white'] ?? 99)
        if (gradeDiff !== 0) return gradeDiff
        return a.name.localeCompare(b.name)
      })
  }, [knights, elementFilter, gradeFilters, search])

  function handleSelect(knight: Knight) {
    onSelect(knight)
    onClose()
  }

  // ANY knight as a synthetic Knight object
  function handleSelectAny() {
    onSelect({ id: 'any', name: 'ANY', element: 'balance', class: 'any' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '80vh',
          overflowY: 'auto',
          backgroundColor: '#111827',
          border: '2px solid #f59e0b',
          boxShadow: '0 0 60px rgba(245,158,11,0.15)',
          marginBottom: '40px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header (blue bar) ───────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: '#1e3a5f', padding: '1rem 1.5rem' }}
        >
          <h2 className="font-bold text-base text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
            style={{ backgroundColor: '#1e293b', color: '#9ca3af' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = '#1e293b' }}
          >
            ✕
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search knight..."
              className="w-full rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none transition-all duration-150"
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#e2e8f0',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.12)' }}
              onBlur={e =>  { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
              🔍
            </span>
          </div>
        </div>

        {/* ── Filter row ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-3 flex flex-wrap gap-1.5 items-center">
          {/* ALL button */}
          <button
            onClick={() => setElementFilter('all')}
            className="px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-150"
            style={{
              backgroundColor: elementFilter === 'all' ? '#f59e0b20' : '#1f2937',
              border: `1px solid ${elementFilter === 'all' ? '#f59e0b' : '#374151'}`,
              color: elementFilter === 'all' ? '#f59e0b' : '#6b7280',
            }}
          >
            ALL
          </button>

          {ELEMENTS.map(el => {
            const active = elementFilter === el
            const color  = ELEMENT_COLORS[el]
            return (
              <button
                key={el}
                onClick={() => setElementFilter(active ? 'all' : el)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-150"
                title={el.charAt(0).toUpperCase() + el.slice(1)}
                style={{
                  backgroundColor: active ? `${color}25` : '#1f2937',
                  border: `1px solid ${active ? color : '#374151'}`,
                  color: active ? color : '#6b7280',
                  boxShadow: active ? `0 0 8px ${color}50` : 'none',
                }}
              >
                <img src={ELEMENT_ICONS[el]} alt={el} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                <span>{el.charAt(0).toUpperCase() + el.slice(1)}</span>
              </button>
            )
          })}
        </div>

        {/* ── Grade filter row ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          flexWrap: 'wrap',
          borderBottom: '1px solid #1e293b',
        }}>
          <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '2px' }}>Grade:</span>
          {gradeFilters.length > 0 && (
            <span style={{ fontSize: '10px', color: '#f59e0b', marginRight: '2px' }}>
              ({gradeFilters.length} selected)
            </span>
          )}

          {GRADES.map(grade => {
            const active = gradeFilters.includes(grade)
            return (
              <button
                key={grade}
                onClick={() => toggleGrade(grade)}
                style={{
                  padding: '3px 12px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: active ? `1.5px solid ${GRADE_COLORS[grade]}` : '1.5px solid #374151',
                  background: active ? GRADE_BG[grade] : 'transparent',
                  color: active ? GRADE_COLORS[grade] : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {grade}
              </button>
            )
          })}

          {gradeFilters.length > 0 && (
            <button
              onClick={() => setGradeFilters([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '10px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0 4px',
              }}
            >
              รีเซ็ต
            </button>
          )}
        </div>

        {/* ── Knight grid ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {loading ? (
            // Skeleton grid
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', padding: '12px' }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{ aspectRatio: '1 / 1', borderRadius: '10px', backgroundColor: '#1f2937', animationDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', padding: '12px' }}>
              {allowAny && <AnyCard onClick={handleSelectAny} />}
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-600 text-sm">
                  No knights found
                </div>
              ) : (
                filtered.map(knight => (
                  <KnightCard key={knight.id} knight={knight} onClick={() => handleSelect(knight)} />
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Footer count ────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-4 py-2 border-t flex items-center justify-between"
          style={{ borderColor: '#1e2d47', backgroundColor: '#0d1117' }}
        >
          <span className="text-xs text-gray-600">
            {filtered.length} / {knights.length} knights
          </span>
          {(elementFilter !== 'all' || gradeFilters.length > 0 || search) && (
            <button
              onClick={() => { setElementFilter('all'); setGradeFilters([]); setSearch('') }}
              className="text-xs font-semibold transition-colors"
              style={{ color: '#4b5563' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f59e0b' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
            >
              Clear filters ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
