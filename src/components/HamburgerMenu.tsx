import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const MENU_ITEMS = [
  { path: '/',     icon: '🏠', label: 'Home' },
  { path: '/gvg',  icon: '🛡️', label: 'GVG Counter' },
  { path: '/stat', icon: '⚔️', label: 'Stat Calculator' },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleNavigate(path: string) {
    navigate(path)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hamburger button — 40×40 dark circle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: open ? '#1e2d47' : '#111827',
          border: `1px solid ${open ? '#f59e0b' : '#1e293b'}`,
          color: open ? '#f59e0b' : '#9ca3af',
          boxShadow: open ? '0 0 12px rgba(245,158,11,0.25)' : 'none',
        }}
        aria-label="เมนูหลัก"
        aria-expanded={open}
      >
        {open ? (
          // X icon when open
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        ) : (
          // Hamburger icon
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="0" y1="1"  x2="16" y2="1"  />
            <line x1="0" y1="7"  x2="16" y2="7"  />
            <line x1="0" y1="13" x2="16" y2="13" />
          </svg>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-lg overflow-hidden z-40"
          style={{
            width: '200px',
            backgroundColor: '#111827',
            border: '1px solid #f59e0b',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.1)',
          }}
        >
          {/* Panel header */}
          <div
            className="px-4 py-2.5 border-b"
            style={{ borderColor: '#1e2d47', backgroundColor: '#0d1117' }}
          >
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
              Navigation
            </p>
          </div>

          {/* Menu items */}
          <nav className="py-1">
            {MENU_ITEMS.map(item => {
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 relative"
                  style={{
                    backgroundColor: isActive ? '#1e2d47' : 'transparent',
                    color: isActive ? '#f59e0b' : '#9ca3af',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1f2937'
                      e.currentTarget.style.color = '#f59e0b'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#9ca3af'
                    }
                  }}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                      style={{ backgroundColor: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}
                    />
                  )}

                  <span className="text-base leading-none w-5 text-center flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold tracking-wide">
                    {item.label}
                  </span>

                  {isActive && (
                    <span
                      className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#f59e0b18', color: '#f59e0b' }}
                    >
                      ●
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}
