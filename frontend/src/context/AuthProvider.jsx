import { useState, useEffect } from 'react'
import { api, getAuthToken, setAuthToken } from '../services/api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getAuthToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()))

  useEffect(() => {
    const currentToken = getAuthToken()
    if (!currentToken) {
      return
    }

    let isMounted = true

    api.user
      .getProfile()
      .then((data) => {
        if (isMounted) {
          setUser(data.profile)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err.status === 401 || err.status === 403) {
            setAuthToken(null)
            setTokenState(null)
            setUser(null)
          }
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (credentials) => {
    const result = await api.auth.login(credentials)
    setTokenState(result.token)
    setUser(result.user)
    return result
  }

  const register = async (credentials) => {
    const result = await api.auth.register(credentials)
    setTokenState(result.token)
    setUser(result.user)
    return result
  }

  const logout = () => {
    api.auth.logout()
    setTokenState(null)
    setUser(null)
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider

