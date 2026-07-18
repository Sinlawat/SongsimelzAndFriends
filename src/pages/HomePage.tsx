import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import KnightAvatar from '../components/gvg/KnightAvatar'
import { useAdmin } from '../hooks/useAdmin'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import type { TeamType } from '../types/index'
import { TEAM_TYPES, TEAM_TYPE_LABELS, TEAM_TYPE_COLORS, normalizeTeamType } from '../types/index'

// ─── Config ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnightBrief {
  id: string
  name: string
  element: string
  image_url?: string
}

interface DefenseRow {
  id: string
  leader_skill?: string | null
  team_type?: string | null
  created_at: string
  leader:  KnightBrief
  knight2: KnightBrief
  knight3?: KnightBrief | null
  counter_count: number
}

type TypeFilter = TeamType | 'all'

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #111827 25%, #1f2937 50%, #111827 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: '12px',
      height: '160px',
      border: '1px solid #1e293b',
    }} />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()
  const [defenses,        setDefenses]        = useState<DefenseRow[]>([])
  const [totalCount,      setTotalCount]      = useState(0)
  const [loading,         setLoading]         = useState(true)   // โหลดหน้าแรก
  const [loadingMore,     setLoadingMore]     = useState(false)  // กดโหลดเพิ่ม
  const [deleteDefenseId, setDeleteDefenseId] = useState<string | null>(null)
  const [typeFilter,      setTypeFilter]      = useState<TypeFilter>('all')

  /**
   * โหลดทีม 1 หน้า (PAGE_SIZE ทีม) จาก RPC — เรียง counter มากสุดก่อนจากทุกทีมใน DB
   * แล้วดึงข้อมูลอัศวินทั้งหน้าใน query เดียว (แทน N+1 แบบเดิม)
   */
  const fetchPage = useCallback(async (offset: number, filter: TypeFilter, append: boolean) => {
    const { data: rows, error } = await supabase.rpc('get_defenses_page', {
      p_limit:     PAGE_SIZE,
      p_offset:    offset,
      p_team_type: filter === 'all' ? null : filter,
    })

    if (error || !rows) {
      console.error('Error fetching defenses:', error)
      return
    }

    // รวม knight ids ทั้งหน้า → ดึงครั้งเดียว
    const knightIds = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows.forEach((r: any) => {
      knightIds.add(r.leader_id)
      knightIds.add(r.knight2_id)
      if (r.knight3_id) knightIds.add(r.knight3_id)
    })

    const km: Record<string, KnightBrief> = {}
    if (knightIds.size > 0) {
      const { data: knightRows } = await supabase
        .from('knights')
        .select('id, name, element, image_url')
        .in('id', Array.from(knightIds))
      knightRows?.forEach((k: KnightBrief) => { km[k.id] = k })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: DefenseRow[] = (rows as any[])
      .filter(r => km[r.leader_id] && km[r.knight2_id])   // กันข้อมูลอัศวินหาย
      .map(r => ({
        id:            r.id,
        leader_skill:  r.leader_skill,
        team_type:     r.team_type,
        created_at:    r.created_at,
        leader:        km[r.leader_id],
        knight2:       km[r.knight2_id],
        knight3:       r.knight3_id ? km[r.knight3_id] ?? null : null,
        counter_count: Number(r.counter_count),
      }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTotalCount(rows.length > 0 ? Number((rows as any[])[0].total_count) : (append ? -1 : 0))
    setDefenses(prev => append ? [...prev, ...mapped] : mapped)
  }, [])

  // โหลดหน้าแรกใหม่ทุกครั้งที่เปลี่ยน filter
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPage(0, typeFilter, false).then(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [typeFilter, fetchPage])

  async function handleLoadMore() {
    setLoadingMore(true)
    await fetchPage(defenses.length, typeFilter, true)
    setLoadingMore(false)
  }

  async function handleDeleteDefense() {
    if (!deleteDefenseId) return
    const { error } = await supabase
      .from('gvg_defenses')
      .delete()
      .eq('id', deleteDefenseId)

    if (!error) {
      setDefenses(prev => prev.filter(d => d.id !== deleteDefenseId))
      setTotalCount(prev => Math.max(0, prev - 1))
    }
    setDeleteDefenseId(null)
  }

  // Admin: เปลี่ยน team_type ผ่าน RPC (เช็ค is_admin ฝั่ง DB)
  async function handleSetTeamType(defenseId: string, teamType: TeamType) {
    const { error } = await supabase.rpc('set_defense_team_type', {
      p_defense_id: defenseId,
      p_team_type:  teamType,
    })
    if (error) {
      console.error('Error setting team type:', error)
      return
    }

    if (typeFilter !== 'all' && teamType !== typeFilter) {
      // เปลี่ยนไปประเภทที่ไม่ตรง filter ปัจจุบัน → เอาออกจากลิสต์
      setDefenses(prev => prev.filter(d => d.id !== defenseId))
      setTotalCount(prev => Math.max(0, prev - 1))
    } else {
      setDefenses(prev => prev.map(d =>
        d.id === defenseId ? { ...d, team_type: teamType } : d
      ))
    }
  }

  const hasMore = defenses.length < totalCount

  return (
    <div style={{ backgroundColor: '#0a0c14', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      {/* Shimmer + spin keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position:  200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ height: '1px', width: '48px', background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
          <span style={{ fontSize: '12px', color: '#f59e0b', letterSpacing: '0.15em', fontWeight: 600 }}>
            GUILD VS GUILD
          </span>
          <div style={{ height: '1px', width: '48px', background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
          Defense Teams
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          เรียงตามจำนวน Counter · คลิกที่ทีมเพื่อดู Counter
        </p>
      </div>

      {/* ── Team type filter chips ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px',
        justifyContent: 'center', marginBottom: '1.5rem',
      }}>
        <button
          onClick={() => setTypeFilter('all')}
          style={{
            padding: '5px 16px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: `1.5px solid ${typeFilter === 'all' ? '#f59e0b' : '#374151'}`,
            background: typeFilter === 'all' ? '#f59e0b20' : 'transparent',
            color: typeFilter === 'all' ? '#f59e0b' : '#6b7280',
            transition: 'all 0.15s',
          }}
        >
          ทั้งหมด
        </button>

        {TEAM_TYPES.map(type => {
          const active = typeFilter === type
          const color  = TEAM_TYPE_COLORS[type]
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(active ? 'all' : type)}
              style={{
                padding: '5px 16px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: `1.5px solid ${active ? color : '#374151'}`,
                background: active ? `${color}20` : 'transparent',
                color: active ? color : '#6b7280',
                boxShadow: active ? `0 0 10px ${color}40` : 'none',
                transition: 'all 0.15s',
              }}
            >
              {TEAM_TYPE_LABELS[type]}
            </button>
          )
        })}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : defenses.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: '#111827', borderRadius: '16px',
            border: '1px solid #1e293b', maxWidth: '400px', margin: '0 auto',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {typeFilter === 'all' ? '🛡️' : '🔍'}
            </div>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 8px' }}>
              {typeFilter === 'all'
                ? 'ยังไม่มีข้อมูลทีม Defense'
                : `ยังไม่มีทีมประเภท "${TEAM_TYPE_LABELS[typeFilter]}"`}
            </p>
            <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
              {typeFilter === 'all'
                ? 'เป็นคนแรกที่เพิ่มทีม Counter ในหน้า GVG'
                : 'ลองเลือกประเภทอื่น หรือกด "ทั้งหมด"'}
            </p>
          </div>
        ) : (
          <>
            {/* จำนวนที่แสดง / ทั้งหมด */}
            <div style={{ textAlign: 'right', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#4b5563' }}>
                แสดง {defenses.length} / {totalCount} ทีม
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {defenses.map((defense, index) => (
                <DefenseCard
                  key={defense.id}
                  defense={defense}
                  index={index}
                  onClick={() => navigate('/gvg?defense_id=' + defense.id)}
                  isAdmin={isAdmin}
                  onDelete={() => setDeleteDefenseId(defense.id)}
                  onSetTeamType={handleSetTeamType}
                />
              ))}
            </div>

            {/* ── Load More ───────────────────────────────────────────── */}
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '10px 32px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: loadingMore ? 'wait' : 'pointer',
                    border: '1.5px solid #f59e0b55',
                    background: '#f59e0b12',
                    color: '#f59e0b',
                    transition: 'all 0.15s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={e => {
                    if (!loadingMore) {
                      e.currentTarget.style.borderColor = '#f59e0b'
                      e.currentTarget.style.background = '#f59e0b22'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#f59e0b55'
                    e.currentTarget.style.background = '#f59e0b12'
                  }}
                >
                  {loadingMore ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '14px', height: '14px',
                        borderRadius: '50%',
                        border: '2px solid #f59e0b44',
                        borderTopColor: '#f59e0b',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      กำลังโหลด...
                    </>
                  ) : (
                    <>โหลดเพิ่ม ({totalCount - defenses.length} ทีม)</>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={deleteDefenseId !== null}
        onClose={() => setDeleteDefenseId(null)}
        onConfirm={handleDeleteDefense}
        title="ลบทีม Defense นี้?"
        description="การลบทีม Defense จะลบ Counter ทั้งหมดที่เกี่ยวข้องด้วย และไม่สามารถกู้คืนได้"
      />
    </div>
  )
}

// ─── Team type badge (+ admin dropdown) ──────────────────────────────────────

function TeamTypeBadge({ defenseId, teamType, isAdmin, onSetTeamType }: {
  defenseId: string
  teamType: TeamType
  isAdmin?: boolean
  onSetTeamType?: (defenseId: string, teamType: TeamType) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const color = TEAM_TYPE_COLORS[teamType]

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => {
          e.stopPropagation()
          if (isAdmin) setMenuOpen(prev => !prev)
        }}
        title={isAdmin ? 'คลิกเพื่อเปลี่ยนประเภททีม' : undefined}
        style={{
          padding: '2px 10px',
          borderRadius: '99px',
          fontSize: '10px',
          fontWeight: 'bold',
          border: `1px solid ${color}66`,
          background: `${color}18`,
          color,
          cursor: isAdmin ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {TEAM_TYPE_LABELS[teamType]}
        {isAdmin && <span style={{ fontSize: '8px' }}>▾</span>}
      </button>

      {isAdmin && menuOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 20,
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '4px',
          minWidth: '110px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {TEAM_TYPES.map(type => {
            const optColor = TEAM_TYPE_COLORS[type]
            const isCurrent = type === teamType
            return (
              <button
                key={type}
                onClick={e => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  if (!isCurrent) onSetTeamType?.(defenseId, type)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  border: 'none',
                  background: isCurrent ? `${optColor}20` : 'transparent',
                  color: optColor,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${optColor}25` }}
                onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? `${optColor}20` : 'transparent' }}
              >
                {isCurrent ? '✓ ' : ''}{TEAM_TYPE_LABELS[type]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Defense card ─────────────────────────────────────────────────────────────

function DefenseCard({ defense, index, onClick, isAdmin, onDelete, onSetTeamType }: {
  defense: DefenseRow
  index: number
  onClick: () => void
  isAdmin?: boolean
  onDelete?: () => void
  onSetTeamType?: (defenseId: string, teamType: TeamType) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: '#111827',
        border: `1px solid ${hovered ? '#f59e0b44' : '#1e293b'}`,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {isAdmin && (
        <button
          onClick={e => { e.stopPropagation(); onDelete?.() }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#7f1d1d',
            border: '1px solid #ef444466',
            color: '#fca5a5',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#7f1d1d' }}
          title="ลบทีม Defense"
        >
          🗑️
        </button>
      )}

      {/* Top row: rank badge + team type + counter count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: index < 3 ? '#f59e0b' : '#1f2937',
          color: index < 3 ? '#000' : '#6b7280',
          fontSize: '12px', fontWeight: 'bold',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {index + 1}
        </div>

        <TeamTypeBadge
          defenseId={defense.id}
          teamType={normalizeTeamType(defense.team_type)}
          isAdmin={isAdmin}
          onSetTeamType={onSetTeamType}
        />

        <span style={{
          fontSize: '11px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '2px 8px',
          color: '#6b7280',
          marginLeft: 'auto',
          marginRight: isAdmin ? '32px' : '0',
        }}>
          {defense.counter_count} counter{defense.counter_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Knight avatars */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <KnightAvatar knight={defense.leader  as any} size={64} showName />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <KnightAvatar knight={defense.knight2 as any} size={64} showName />
        {defense.knight3 && (
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          <KnightAvatar knight={defense.knight3 as any} size={64} showName />
        )}
      </div>

      {/* Leader skill */}
      {defense.leader_skill && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold' }}>Leader Skill: </span>
          <span style={{
            fontSize: '11px', color: '#9ca3af',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', maxHeight: '32px',
          }}>
            {defense.leader_skill}
          </span>
        </div>
      )}

      {/* Date added */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '10px', color: '#374151' }}>
          {new Date(defense.created_at).toLocaleDateString('th-TH')}
        </span>
      </div>
    </div>
  )
}
