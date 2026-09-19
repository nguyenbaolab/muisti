import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-base border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)] ${className}`}
      {...props}
    />
  )
}
