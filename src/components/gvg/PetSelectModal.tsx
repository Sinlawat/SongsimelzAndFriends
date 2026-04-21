import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Pet } from '../../types/index'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (pet: Pet | null) => void
  currentPetId?: string | null
  slotLabel: string
}

export default function PetSelectModal({ isOpen, onClose, onSelect, currentPetId, slotLabel }: Props) {
  const [pets,   setPets]   = useState<Pet[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSearch('')
    supabase.from('pets').select('*').order('name')
      .then(({ data }) => setPets(data ?? []))
  }, [isOpen])

  if (!isOpen) return null

  const filtered = pets.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '80px',
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '480px',
          backgroundColor: '#111827',
          border: '2px solid #a855f7',
          borderRadius: '12px',
          overflow: 'hidden',
          alignSelf: 'flex-start',
          marginBottom: '40px',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#2d1b69',
          padding: '12px 20px',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
            🐾 เลือกสัตว์เลี้ยง — {slotLabel}
          </span>
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px',
              background: '#1e293b',
              color: '#9ca3af',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#9ca3af' }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e293b' }}>
          <input
            type="text"
            placeholder="ค้นหาสัตว์เลี้ยง..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: '#0d1117',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#a855f7'}
            onBlur={e =>  e.currentTarget.style.borderColor = '#1e293b'}
          />
        </div>

        {/* Pet grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: '8px',
          padding: '12px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          {/* "No pet" card */}
          <NoPetCard onSelect={() => { onSelect(null); onClose() }} />

          {filtered.map(pet => (
            <PetCard
              key={pet.id}
              pet={pet}
              isSelected={currentPetId === pet.id}
              onSelect={() => { onSelect(pet); onClose() }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── No-pet card ──────────────────────────────────────────────────────────────

function NoPetCard({ onSelect }: { onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '90px', height: '100px',
        background: '#1f2937',
        border: `1.5px dashed ${hovered ? '#ef4444' : '#374151'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'border-color 0.15s',
      }}
    >
      <span style={{ fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>✕</span>
      <span style={{ fontSize: '10px', color: '#6b7280' }}>ไม่มี</span>
    </div>
  )
}

// ─── Pet card ─────────────────────────────────────────────────────────────────

function PetCard({ pet, isSelected, onSelect }: {
  pet: Pet
  isSelected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '90px', height: '100px',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1f2937',
        border: isSelected
          ? '2px solid #a855f7'
          : `1.5px solid ${hovered ? '#a855f7' : '#374151'}`,
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
    >
      {/* Image area */}
      <div style={{ width: '90px', height: '72px', flexShrink: 0 }}>
        {pet.image_url ? (
          <img
            src={pet.image_url}
            alt={pet.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: '#2d1b69',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
          }}>
            🐾
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        height: '28px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2px 6px',
      }}>
        <span style={{
          fontSize: '9px', color: 'white', textAlign: 'center',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          width: '100%',
        }}>
          {pet.name}
        </span>
      </div>

      {/* Selected badge */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '16px', height: '16px',
          borderRadius: '50%',
          background: '#a855f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: 'white', fontWeight: 'bold',
        }}>
          ✓
        </div>
      )}
    </div>
  )
}
