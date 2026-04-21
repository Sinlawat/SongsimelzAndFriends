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
      className="w-full flex flex-col overflow-hidden rounded-[10px] cursor-pointer relative"
      style={{
        background: '#1f2937',
        border: `2px solid ${isSelected || hovered ? '#f59e0b' : '#374151'}`,
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
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
      <div className="flex flex-col items-center justify-center flex-1 gap-1 sm:gap-[4px] pt-2 sm:pt-[6px] pb-1">
        {/* BACK label */}
        <span style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '0.05em', lineHeight: 1 }}>
          BACK
        </span>

        {/* Back row circles */}
        <div className="flex gap-1 sm:gap-[5px] items-center">
          {formation.backSlots.map(slot => (
            <div
              key={slot}
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: '#374151',
                border: '1px solid #4b5563',
                fontSize: '9px',
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              {slot}
            </div>
          ))}
        </div>

        {/* Front row circles */}
        <div className="flex gap-1 sm:gap-[5px] items-center">
          {formation.frontSlots.map(slot => (
            <div
              key={slot}
              className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: '#1e3a5f',
                border: '1px solid #3b82f6',
                fontSize: '9px',
                color: '#fff',
                fontWeight: 'bold',
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
      <div style={{ background: 'rgba(0,0,0,0.70)', padding: '4px 8px' }}>
        <p className="text-[10px] sm:text-xs font-bold text-center truncate m-0" style={{ color: '#fff' }}>
          {formation.name}
        </p>
        <p className="text-[9px] sm:text-[10px] text-center m-0 truncate" style={{ color: '#9ca3af' }}>
          {formation.description}
        </p>
      </div>
    </div>
  )
}
