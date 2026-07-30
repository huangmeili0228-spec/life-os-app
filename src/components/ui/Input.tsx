import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]',
        'text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]',
        'focus:border-[var(--color-accent)] transition-colors',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full px-3.5 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]',
        'text-[15px] leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]',
        'focus:border-[var(--color-accent)] transition-colors',
        className,
      )}
      {...props}
    />
  )
}
