import { useState } from 'react'
import { useAuth } from '../../services/AuthContext'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Loader2, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const { signInAction, signUpAction } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInAction(email.trim(), password)
      } else {
        await signUpAction(email.trim(), password)
      }
    } catch (e: any) {
      setError(e.message ?? '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 safe-top safe-bottom bg-[var(--color-bg)]">
      <div className="w-full max-w-[320px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight">Life OS</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
            {mode === 'login' ? '欢迎回来' : '开始你的人生管理'}
          </p>
        </div>

        {/* 表单 */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--color-text-tertiary)] mb-1 block">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-tertiary)] mb-1 block">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
              <AlertCircle size={14} className="text-[var(--color-danger)]" />
              <span className="text-xs text-[var(--color-danger)]">{error}</span>
            </div>
          )}

          <Button
            block
            onClick={handleSubmit}
            disabled={!email.trim() || !password.trim() || loading}
            size="lg"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> 处理中…</>
            ) : mode === 'login' ? '登录' : '注册'}
          </Button>
        </div>

        {/* 切换 */}
        <div className="text-center mt-4">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="tap text-xs text-[var(--color-accent)]"
          >
            {mode === 'login' ? '没有账号？注册一个' : '已有账号？去登录'}
          </button>
        </div>

        <p className="text-[11px] text-[var(--color-text-tertiary)] text-center mt-6 leading-relaxed">
          数据与你的账号绑定，换设备登录即可自动同步
        </p>
      </div>
    </div>
  )
}
