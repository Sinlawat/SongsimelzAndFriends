import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import UserButton from './components/UserButton'
import HamburgerMenu from './components/HamburgerMenu'
import LoginModal from './components/LoginModal'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import StatCalculatorPage from './pages/StatCalculatorPage'
import GVGPage from './pages/GVGPage'

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  const { user, loading } = useAuth()

  // ── Auth gate ────────────────────────────────────────────────────────────
  // 1) กำลังเช็ค session → แสดง splash กันหน้ากระพริบ
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: '#0a0c14' }}
      >
        <span className="text-4xl">⚔️</span>
        <span
          className="inline-block w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: '#f59e0b33', borderTopColor: '#f59e0b' }}
        />
      </div>
    )
  }

  // 2) ยังไม่ล็อกอิน → บังคับเข้าหน้า Login ก่อนเสมอ
  if (!user) {
    return <LoginPage />
  }

  // 3) ล็อกอินแล้ว → เข้าแอปตามปกติ
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0c14', color: '#e2e8f0' }}>

      {/* ── Fixed header ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5"
        style={{
          backgroundColor: '#0a0c14ee',
          borderBottom: '1px solid #1e2d47',
          backdropFilter: 'blur(12px)',
          height: '64px',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all duration-200"
            style={{ backgroundColor: '#f59e0b18', border: '1px solid #f59e0b40' }}
          >
            ⚔️
          </div>
          <span className="font-black tracking-widest text-sm uppercase gold-shimmer hidden sm:block">
            SongsimelzAndFriends
          </span>
          <span className="font-black tracking-wider text-sm uppercase gold-shimmer sm:hidden">
            SFG
          </span>
        </Link>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          <UserButton onLoginClick={() => setLoginOpen(true)} />
          <HamburgerMenu />
        </div>
      </header>

      {/* ── Page content (offset for 64px fixed header) ───────────────────────── */}
      <div className="pt-16">
        <Routes>
          <Route path="/"     element={<HomePage />} />
          <Route path="/gvg"  element={<GVGPage onOpenLogin={() => setLoginOpen(true)} />} />
          <Route path="/stat" element={<StatCalculatorPage />} />
        </Routes>
      </div>

      {/* ── Login Modal ──────────────────────────────────────────────────────── */}
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

    </div>
  )
}
