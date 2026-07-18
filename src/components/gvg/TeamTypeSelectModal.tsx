import { useEffect } from 'react'
import type { TeamType } from '../../types/index'
import { TEAM_TYPES, TEAM_TYPE_LABELS, TEAM_TYPE_COLORS } from '../../types/index'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** เรียกเมื่อผู้ใช้เลือกประเภททีม — จากนั้น caller ค่อย insert defense ต่อ */
  onSelect: (teamType: TeamType) => void
}

/**
 * Modal เลือกประเภททีม Defense — แสดงตอนสร้าง defense ใหม่
 * (กด "+ Contribute Counter" กับทีมที่ยังไม่มีในระบบ)
 */
export default function TeamTypeSelectModal({ isOpen, onClose, onSelect }: Props) {
  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%', maxWidth: '360px',
          backgroundColor: '#111827',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          boxShadow: '0 0 60px rgba(245,158,11,0.15)',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '0 0 4px' }}>
            ทีม Defense นี้เป็นทีมประเภทไหน?
          </h3>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            เลือกประเภทเพื่อให้คนอื่นค้นหาทีมได้ง่ายขึ้น
          </p>
        </div>

        {/* Type buttons — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {TEAM_TYPES.map(type => {
            const color = TEAM_TYPE_COLORS[type]
            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: `1.5px solid ${color}55`,
                  background: `${color}15`,
                  color,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = color
                  e.currentTarget.style.background = `${color}30`
                  e.currentTarget.style.boxShadow = `0 0 12px ${color}40`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = `${color}55`
                  e.currentTarget.style.background = `${color}15`
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {TEAM_TYPE_LABELS[type]}
              </button>
            )
          })}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '8px',
            borderRadius: '8px',
            fontSize: '12px',
            background: 'transparent',
            border: '1px solid #374151',
            color: '#6b7280',
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6b7280'; e.currentTarget.style.color = '#9ca3af' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#6b7280' }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
