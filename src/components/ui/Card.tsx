import { type HTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)]',
        padded && 'p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
