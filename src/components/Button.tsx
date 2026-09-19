import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] dark:bg-[var(--color-accent-dark)]',
  secondary:
    'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:text-[var(--color-text-dark)]',
  danger:
    'bg-[var(--color-danger)] text-white hover:opacity-90 dark:bg-[var(--color-danger-dark)]',
}

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={Boolean(disabled) || loading}
      aria-busy={loading || undefined}
      className={`rounded-base px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    />
  )
}
