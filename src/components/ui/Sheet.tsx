import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** 底部固定操作区 */
  footer?: ReactNode
}

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 animate-overlay"
        onClick={onClose}
      />
      {/* 面板 */}
      <div className="relative bg-[var(--color-bg-elevated)] rounded-t-3xl border-t border-[var(--color-border)] max-h-[90vh] flex flex-col animate-slide-up">
        {/* 拖拽指示器 */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
        </div>
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
            <button
              onClick={onClose}
              className="tap w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] active:bg-[var(--color-bg-hover)]"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {/* 内容 */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
          {children}
        </div>
        {/* 底部 */}
        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-6 safe-bottom border-t border-[var(--color-border-subtle)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
