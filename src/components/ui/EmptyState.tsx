import { type ReactNode } from 'react'
import clsx from 'clsx'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-text-tertiary)] mb-4">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-medium text-[var(--color-text-secondary)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-text-tertiary)] mt-1.5 max-w-[240px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={clsx('flex bg-[var(--color-bg-elevated)] rounded-xl p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'tap flex-1 h-8 rounded-lg text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-[var(--color-bg-hover)] text-[var(--color-text)]'
              : 'text-[var(--color-text-tertiary)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
