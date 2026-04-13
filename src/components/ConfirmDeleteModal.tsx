import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  title: string
  description: string
}

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, description }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  async function handleConfirm() {
    setIsDeleting(true)
    await onConfirm()
    setIsDeleting(false)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '400px',
          background: '#111827',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: '40px', marginBottom: '12px' }}>🗑️</div>

        {/* Title */}
        <p style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
          {title}
        </p>

        {/* Description */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '8px', marginBottom: '24px' }}>
          {description}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: '1px solid #374151',
              color: '#9ca3af',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ยกเลิก
          </button>

          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '10px',
              background: isDeleting ? '#7f1d1d' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.15s',
            }}
          >
            {isDeleting ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff44',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                  }}
                />
                กำลังลบ...
              </>
            ) : 'ลบ'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
