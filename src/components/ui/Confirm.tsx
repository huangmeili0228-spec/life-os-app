import { type ReactNode, createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// ============================================================
// 确认弹窗
// ============================================================
interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  danger?: boolean
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false,
)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean
    opts: ConfirmOptions
    resolve?: (v: boolean) => void
  }>({ open: false, opts: { title: '' } })

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolve })
    })
  }, [])

  const close = (result: boolean) => {
    state.resolve?.(result)
    setState((s) => ({ ...s, open: false }))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-black/30 animate-overlay" onClick={() => close(false)} />
          <div className="relative w-full max-w-[300px] bg-[var(--color-bg-elevated)] rounded-2xl border border-[var(--color-border)] p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              {state.opts.danger && (
                <div className="w-9 h-9 rounded-full bg-[var(--color-danger)]/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-[var(--color-danger)]" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{state.opts.title}</h3>
                {state.opts.message && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                    {state.opts.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => close(false)}
                className="tap flex-1 h-10 rounded-xl bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={() => close(true)}
                className={
                  'tap flex-1 h-10 rounded-xl text-sm font-medium ' +
                  (state.opts.danger
                    ? 'bg-[var(--color-danger)] text-white'
                    : 'bg-[var(--color-accent)] text-white')
                }
              >
                {state.opts.confirmText ?? '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
