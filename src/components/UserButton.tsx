import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onLoginClick: () => void
}

export default function UserButton({ onLoginClick }: Props) {
  const { user, loading, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  // Derive display initials from email or show placeholder
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'SK'

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
  }

  // Loading state — subtle pulse ring
  if (loading) {
    return (
      <div
        className="w-10 h-10 rounded-full animate-pulse"
        style={{ backgroundColor: '#1e293b', border: '1px solid #1e2d47' }}
      />
    )
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
        style={{
          backgroundColor: '#1e2d47',
          border: '1px solid #f59e0b50',
          color: '#f59e0b',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#f59e0b18'
          e.currentTarget.style.borderColor = '#f59e0b'
          e.currentTarget.style.boxShadow = '0 0 12px rgba(245,158,11,0.2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = '#1e2d47'
          e.currentTarget.style.borderColor = '#f59e0b50'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <span>👤</span>
        <span className="hidden sm:inline">เข้าสู่ระบบ</span>
      </button>
    )
  }

  // ── Logged in ──────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setDropdownOpen(o => !o)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-200"
        style={{
          backgroundColor: dropdownOpen ? '#f59e0b18' : '#1e293b',
          border: `1px solid ${dropdownOpen ? '#f59e0b' : '#f59e0b55'}`,
          color: '#f59e0b',
          boxShadow: dropdownOpen ? '0 0 14px rgba(245,158,11,0.25)' : 'none',
        }}
        aria-label="บัญชีผู้ใช้"
      >
        {initials}
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-40"
          style={{
            width: '220px',
            backgroundColor: '#111827',
            border: '1px solid #f59e0b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.08)',
          }}
        >
          {/* User info */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: '#1e2d47', backgroundColor: '#0d1117' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40', color: '#f59e0b' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: '#e2e8f0' }}>
                  {user.email}
                </p>
                <p className="text-xs" style={{ color: '#4b5563' }}>ผู้ใช้งาน</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors duration-150"
            style={{ color: '#9ca3af' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2d1a1a'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            <span>🚪</span>
            <span className="font-semibold">ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  )
}
