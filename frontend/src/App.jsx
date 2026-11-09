import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import UserProfile from './pages/UserProfile/UserProfile'
import AdminDashboard from './pages/Admin/AdminDashboard'
import './App.css'

function App() {
  const location = useLocation()
  const cleanPath = location.pathname.replace(/\/+$/, '') || '/'
  const isDashboardRoute = cleanPath === '/user-profile' || cleanPath === '/profile' || cleanPath === '/admin'
  const isAuthRoute = cleanPath === '/login' || cleanPath === '/register'
  const isLandingRoute = cleanPath === '/'

  useEffect(() => {
    // Keep unified dark theme across all application pages matching velooprewards.in
    document.documentElement.setAttribute('data-theme', 'dark-gaming')
    document.body.style.backgroundColor = '#0d0f1d'
    document.body.style.color = '#ffffff'
  }, [])

  return (
    <AuthProvider>
      {isLandingRoute ? (
        /* Standalone Public Landing Page */
        <main className="landing-page-root">
          <Home />
        </main>
      ) : isAuthRoute ? (
        /* Clean Fullscreen Authentication Page (No Navbar / No Sidebar) */
        <main className="auth-page-root">
          <Routes>
            <Route path="/login" element={<Login initialMode="login" />} />
            <Route path="/register" element={<Login initialMode="register" />} />
          </Routes>
        </main>
      ) : (
        /* Authenticated Command Center Shell (Sidebar + TopHeader + Footer) */
        <div
          className={`app-shell ${isDashboardRoute ? 'theme-dark-gaming' : ''}`}
          data-theme="dark-gaming"
        >
          {/* Compact Vertical Icon Sidebar */}
          <Sidebar />

          {/* Main Application Surface */}
          <div className="app-main-surface">
            <div className="app-surface-frame">
              {/* Top Navigation Bar */}
              <TopHeader />

              {/* Routed Page Content */}
              <main className="app-content-body">
                <Routes>
                  <Route path="/user-profile" element={<UserProfile />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Clean Footer */}
              <footer className="app-footer">
                <small className="footer-text">
                  &copy; {new Date().getFullYear()} VE Loop Rewards. Enterprise Loyalty & Wallet System.
                </small>
                <div className="footer-links">
                  <span className="footer-link">Privacy Policy</span>
                  <span className="footer-link">Terms of Service</span>
                  <span className="footer-link">Security</span>
                </div>
              </footer>
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  )
}

export default App
