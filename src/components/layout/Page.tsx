import { type ReactNode } from 'react'
import clsx from 'clsx'

interface PageProps {
  children: ReactNode
  /** 是否需要底部留白（给 Tab Bar 让位） */
  bottomPad?: boolean
  className?: string
}

/** 页面容器：统一顶部安全区、滚动、底部留白 */
export function Page({ children, bottomPad = true, className }: PageProps) {
  return (
    <div
      className={clsx(
        'min-h-dvh safe-top',
        bottomPad && 'pb-24',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  right?: ReactNode
}

/** 页面顶部标题 */
export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="px-5 pt-3 pb-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </div>
  )
}
