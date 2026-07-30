import { type ReactNode, createContext, useCallback, useContext, useState } from 'react'
import { Check } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string) => {
    const id = Date.now()
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((i) => i.id !== id))
    }, 2000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-[70] flex flex-col items-center pt-14 safe-top pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="mb-2 px-4 py-2.5 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-lg flex items-center gap-2 animate-fade-in"
          >
            <Check size={16} className="text-[var(--color-success)]" />
            <span className="text-sm text-[var(--color-text)]">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
