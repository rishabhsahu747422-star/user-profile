import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import UserProfile from './pages/UserProfile/UserProfile'
import AdminDashboard from './pages/Admin/AdminDashboard'
import './App.css'

function AppContent() {
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register'

  if (isAuthRoute) {
    return (
      <div className="auth-shell">
        <main className="auth-content-body">
          <Routes>
            <Route path="/login" element={<Login key="login" initialMode="login" />} />
            <Route path="/register" element={<Login key="register" initialMode="register" />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
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
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<Navigate to="/register" replace />} />
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
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
