"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { jwtDecode } from "jwt-decode"

interface JwtPayload {
  sub: string
  name?: string
  exp: number
}

interface AuthContextValue {
  token: string | null
  username: string | null
  login: (token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("token")
      if (!stored) return null
      const payload = jwtDecode<JwtPayload>(stored)
      if (payload.exp * 1000 > Date.now()) return stored
      localStorage.removeItem("token")
    } catch {
      localStorage.removeItem("token")
    }
    return null
  })

  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("token")
      if (!stored) return null
      const payload = jwtDecode<JwtPayload>(stored)
      if (payload.exp * 1000 > Date.now()) return payload.name ?? payload.sub
    } catch {}
    return null
  })

  function login(newToken: string) {
    localStorage.setItem("token", newToken)
    const payload = jwtDecode<JwtPayload>(newToken)
    setToken(newToken)
    setUsername(payload.name ?? payload.sub)
  }

  function logout() {
    localStorage.removeItem("token")
    setToken(null)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
