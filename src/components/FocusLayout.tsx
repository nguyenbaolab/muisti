import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

/** Same as DeckDetail backLinkClassName, without mb-4 — spacing lives on the content wrapper. */
export const focusBackLinkClassName =
  'inline-block text-base text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] dark:text-[var(--color-text-muted-dark)] dark:hover:text-[var(--color-text-dark)]'

type FocusLayoutProps = {
  children: ReactNode
}

export function FocusLayout({ children }: FocusLayoutProps) {
  return (
    <main className="mx-auto w-full max-w-xl px-3 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/" className={focusBackLinkClassName}>
          ← Trang chủ
        </Link>
        <ThemeToggle />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  )
}
