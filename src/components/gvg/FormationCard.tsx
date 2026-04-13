import { useState } from 'react'
import type { Formation } from '../../types/index'

interface Props {
  formation: Formation
  isSelected: boolean
  onClick: () => void
}

export default function FormationCard({ formation, isSelected, onClick }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '160px',
        height: '120px',
        background: '#1f2937',
        border: `2px solid ${isSelected || hovered ? '#f59e0b' : '#374151'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        flexShrink: 0,
      }}
    >
      {/* ── Selected checkmark badge ─────────────────────────────────────── */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          width: '20px',
          height: '20px',
          background: '#f59e0b',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#000',
          zIndex: 1,
        }}>
          ✓
        </div>
      )}

      {/* ── Formation diagram ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '78px',
        gap: '4px',
        paddingTop: '6px',
      }}>
        {/* BACK label */}
        <span style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '0.05em', lineHeight: 1 }}>
          BACK
        </span>

        {/* Back row circles */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {formation.backSlots.map(slot => (
            <div
              key={slot}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#374151',
                border: '1px solid #4b5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: '#fff',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {slot}
            </div>
          ))}
        </div>

        {/* Front row circles */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {formation.frontSlots.map(slot => (
            <div
              key={slot}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#1e3a5f',
                border: '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: '#fff',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {slot}
            </div>
          ))}
        </div>

        {/* FRONT label */}
        <span style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '0.05em', lineHeight: 1 }}>
          FRONT
        </span>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.70)',
        padding: '4px 8px',
      }}>
        <p style={{
          fontSize: '10px',
          color: '#fff',
          fontWeight: 'bold',
          textAlign: 'center',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {formation.name}
        </p>
        <p style={{
          fontSize: '9px',
          color: '#9ca3af',
          textAlign: 'center',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          {formation.description}
        </p>
      </div>
    </div>
  )
}
