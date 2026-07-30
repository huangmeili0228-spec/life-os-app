/**
 * Life OS — Auth 上下文
 * 提供全局登录状态、用户信息、登录/注册/登出方法。
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import {
  signIn, signUp, signOut, getCurrentUser, onAuthChange,
  isCloudAvailable,
} from '../services/cloudSync'

interface AuthState {
  user: User | null
  loading: boolean
  cloudReady: boolean
  signInAction: (email: string, password: string) => Promise<void>
  signUpAction: (email: string, password: string) => Promise<void>
  signOutAction: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  cloudReady: false,
  signInAction: async () => {},
  signUpAction: async () => {},
  signOutAction: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const cloudReady = isCloudAvailable()

  useEffect(() => {
    if (!cloudReady) {
      setLoading(false)
      return
    }

    // 检查是否已有登录会话（异步）
    getCurrentUser().then((current) => {
      if (current) setUser(current)
    }).catch(() => {})

    const { data } = onAuthChange((u) => {
      setUser(u)
      setLoading(false)
    })

    // 超时兜底
    const timeout = setTimeout(() => setLoading(false), 5000)

    return () => {
      data?.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [cloudReady])

  const signInAction = useCallback(async (email: string, password: string) => {
    await signIn(email, password)
  }, [])

  const signUpAction = useCallback(async (email: string, password: string) => {
    await signUp(email, password)
  }, [])

  const signOutAction = useCallback(async () => {
    await signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading, cloudReady,
      signInAction, signUpAction, signOutAction,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
