import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  /** Login ด้วย username หรือ email ก็ได้ — คืน error message ภาษาไทย (null = สำเร็จ) */
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: AuthError | null }>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hydrate from existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Keep state in sync with Supabase auth events (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  function translateAuthError(message: string): string {
    if (message.includes('Invalid login credentials')) return 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง'
    if (message.includes('Email not confirmed'))       return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'
    return message
  }

  /**
   * Login ด้วย username หรือ email
   * - มี '@' → ถือว่าเป็น email, login ตรง
   * - ไม่มี '@' → เรียก RPC get_email_by_username หา email ก่อน แล้วค่อย login
   */
  async function signIn(identifier: string, password: string): Promise<{ error: string | null }> {
    let email = identifier.trim()

    if (!email.includes('@')) {
      const { data, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: email,
      })
      if (rpcError || !data) {
        return { error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' }
      }
      email = data as string
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: translateAuthError(error.message) }
    return { error: null }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithEmail, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
