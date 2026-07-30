import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent)] text-white active:bg-[var(--color-accent-hover)]',
  secondary: 'bg-[var(--color-bg-hover)] text-[var(--color-text)] active:bg-[var(--color-border)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] active:bg-[var(--color-bg-hover)]',
  danger: 'bg-[var(--color-danger)] text-white active:opacity-80',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-[15px] rounded-xl',
  lg: 'h-12 px-5 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'tap inline-flex items-center justify-center gap-2 font-medium select-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        variantClass[variant],
        sizeClass[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
