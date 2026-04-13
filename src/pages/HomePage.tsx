import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import KnightAvatar from '../components/gvg/KnightAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DefenseRow {
  id: string
  leader_skill?: string
  created_at: string
  leader:  { id: string; name: string; element: string; image_url?: string }
  knight2: { id: string; name: string; element: string; image_url?: string }
  knight3?: { id: string; name: string; element: string; image_url?: string } | null
  counter_count: number
}

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
  const [defenses, setDefenses] = useState<DefenseRow[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const fetchDefenses = async () => {
      const { data } = await supabase
        .from('gvg_defenses')
        .select(`
          id,
          leader_skill,
          created_at,
          leader:knights!gvg_defenses_leader_id_fkey(id, name, element, image_url),
          knight2:knights!gvg_defenses_knight2_id_fkey(id, name, element, image_url),
          knight3:knights!gvg_defenses_knight3_id_fkey(id, name, element, image_url)
        `)
        .limit(20)
        .order('created_at', { ascending: false })

      if (data) {
        const withCounts = await Promise.all(
          data.map(async (def: any) => {
            const { count } = await supabase
              .from('gvg_counters')
              .select('*', { count: 'exact', head: true })
              .eq('defense_id', def.id)
            return { ...def, counter_count: count ?? 0 }
          })
        )
        setDefenses(withCounts.sort((a, b) => b.counter_count - a.counter_count))
      }
      setLoading(false)
    }
    fetchDefenses()
  }, [])

  return (
    <div style={{ backgroundColor: '#0a0c14', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position:  200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ height: '1px', width: '48px', background: 'linear-gradient(to right, transparent, #f59e0b)' }} />
          <span style={{ fontSize: '12px', color: '#f59e0b', letterSpacing: '0.15em', fontWeight: 600 }}>
            GUILD VS GUILD
          </span>
          <div style={{ height: '1px', width: '48px', background: 'linear-gradient(to left, transparent, #f59e0b)' }} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
          Top Defense Teams
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          คลิกที่ทีมเพื่อดู Counter
        </p>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : defenses.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: '#111827', borderRadius: '16px',
            border: '1px solid #1e293b', maxWidth: '400px', margin: '0 auto',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 8px' }}>
              ยังไม่มีข้อมูลทีม Defense
            </p>
            <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
              เป็นคนแรกที่เพิ่มทีม Counter ในหน้า GVG
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {defenses.map((defense, index) => (
              <DefenseCard
                key={defense.id}
                defense={defense}
                index={index}
                onClick={() => navigate('/gvg?defense_id=' + defense.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Defense card ─────────────────────────────────────────────────────────────

function DefenseCard({ defense, index, onClick }: {
  defense: DefenseRow
  index: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
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
      {/* Top row: rank badge + counter count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
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

        <span style={{
          fontSize: '11px',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '2px 8px',
          color: '#6b7280',
        }}>
          {defense.counter_count} counter{defense.counter_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Knight avatars */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
        <KnightAvatar knight={defense.leader  as any} size={64} showName />
        <KnightAvatar knight={defense.knight2 as any} size={64} showName />
        {defense.knight3 && (
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
