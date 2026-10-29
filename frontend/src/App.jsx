import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import Navbar from './components/Navbar'
import Home from './pages/Home/Home'
import Login from './pages/Login/Login'
import UserProfile from './pages/UserProfile/UserProfile'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />

        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <footer className="app-footer py-3 text-center">
          <div className="container">
            <small className="footer-text">
              &copy; {new Date().getFullYear()} VE Loop Rewards. All rights reserved.
            </small>
          </div>
        </footer>
      </div>
    </AuthProvider>
  )
}

export default App
