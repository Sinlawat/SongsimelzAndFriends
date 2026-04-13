import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  isOpen: boolean
  onClose: () => void
}

function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (message.includes('Email not confirmed'))       return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'
  return message
}

export default function LoginModal({ isOpen, onClose }: Props) {
  const { signInWithEmail } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const overlayRef  = useRef<HTMLDivElement>(null)
  const emailRef    = useRef<HTMLInputElement>(null)

  // Focus email field when modal opens; reset form when it closes
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setTimeout(() => emailRef.current?.focus(), 50)
    } else {
      setEmail('')
      setPassword('')
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await signInWithEmail(email, password)

    if (authError) {
      setError(translateError(authError.message))
      setLoading(false)
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full rounded-xl p-8 flex flex-col gap-6"
        style={{
          maxWidth: '380px',
          backgroundColor: '#111827',
          border: '1px solid #f59e0b',
          boxShadow: '0 0 40px rgba(245,158,11,0.15)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors"
          style={{ backgroundColor: '#1e293b', color: '#6b7280' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#e2e8f0'
            e.currentTarget.style.backgroundColor = '#374151'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#6b7280'
            e.currentTarget.style.backgroundColor = '#1e293b'
          }}
          aria-label="ปิด"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl leading-none" role="img" aria-label="sword">⚔️</span>
          <h2
            className="text-xl font-black tracking-wide mt-1"
            style={{ color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.35)' }}
          >
            เข้าสู่ระบบ
          </h2>
          <p className="text-xs text-gray-600">Seven Knights Rebirth · Stat Calculator</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              อีเมล
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="อีเมล"
              required
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#e2e8f0',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.15)' }}
              onBlur={e =>  { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              required
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#e2e8f0',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.15)' }}
              onBlur={e =>  { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              className="text-xs text-center px-3 py-2 rounded-lg"
              style={{ color: '#fca5a5', backgroundColor: '#7f1d1d30', border: '1px solid #7f1d1d' }}
            >
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-lg font-black text-sm uppercase tracking-widest transition-all duration-200 mt-1"
            style={{
              background: loading || !email || !password
                ? '#374151'
                : 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
              color: loading || !email || !password ? '#6b7280' : '#0a0c14',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              boxShadow: !loading && email && password ? '0 4px 20px rgba(245,158,11,0.30)' : 'none',
            }}
            onMouseEnter={e => {
              if (!loading && email && password) {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.50)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = !loading && email && password
                ? '0 4px 20px rgba(245,158,11,0.30)'
                : 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#6b728066', borderTopColor: '#9ca3af' }}
                />
                กำลังเข้าสู่ระบบ...
              </span>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}
