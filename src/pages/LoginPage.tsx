import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Full-page login gate — shown before any other page when not authenticated.
 * รองรับทั้ง username และ email:
 *   - มี '@'  → login ด้วย email ตรง ๆ
 *   - ไม่มี '@' → lookup email จาก username ผ่าน RPC ก่อน
 */
export default function LoginPage() {
  const { signIn } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const identifierRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    identifierRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await signIn(identifier, password)

    if (authError) {
      setError(authError)
      setLoading(false)
    }
    // สำเร็จ → AuthContext อัปเดต user เอง แล้ว App จะสลับไปหน้า Home อัตโนมัติ
  }

  const canSubmit = !loading && identifier.trim() !== '' && password !== ''

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    color: '#e2e8f0',
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#f59e0b'
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.15)'
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#374151'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0a0c14' }}
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
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-5xl leading-none" role="img" aria-label="sword">⚔️</span>
          <h1
            className="text-xl font-black tracking-wide mt-1"
            style={{ color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.35)' }}
          >
            SongsimelzAndFriends
          </h1>
          <p className="text-xs text-gray-600">เข้าสู่ระบบเพื่อใช้งาน · Seven Knights Rebirth</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          {/* Username or Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              ชื่อผู้ใช้ หรือ อีเมล
            </label>
            <input
              ref={identifierRef}
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="username หรือ name@email.com"
              required
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-150 disabled:opacity-50"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              required
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-150 disabled:opacity-50"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
            disabled={!canSubmit}
            className="w-full py-3 rounded-lg font-black text-sm uppercase tracking-widest transition-all duration-200 mt-1"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                : '#374151',
              color: canSubmit ? '#0a0c14' : '#6b7280',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              boxShadow: canSubmit ? '0 4px 20px rgba(245,158,11,0.30)' : 'none',
            }}
            onMouseEnter={e => {
              if (canSubmit) {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(245,158,11,0.50)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = canSubmit ? '0 4px 20px rgba(245,158,11,0.30)' : 'none'
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
