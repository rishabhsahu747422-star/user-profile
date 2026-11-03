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
  const isProfileRoute = cleanPath === '/user-profile' || cleanPath === '/profile'

  useEffect(() => {
    if (isProfileRoute) {
      document.documentElement.setAttribute('data-theme', 'dark-gaming')
      document.body.style.backgroundColor = '#07090E'
      document.body.style.color = '#F8FAFC'
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [isProfileRoute])

  return (
    <AuthProvider>
      <div
        className={`app-shell ${isProfileRoute ? 'theme-dark-gaming' : ''}`}
        data-theme={isProfileRoute ? 'dark-gaming' : 'light'}
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
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
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
    </AuthProvider>
  )
}

export default App
