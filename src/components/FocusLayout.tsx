import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { backLinkClassName } from './linkClasses'
import { ThemeToggle } from './ThemeToggle'

type FocusLayoutProps = {
  children: ReactNode
}

export function FocusLayout({ children }: FocusLayoutProps) {
  return (
    <main className="mx-auto w-full max-w-xl px-3 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/" className={backLinkClassName}>
          ← Trang chủ
        </Link>
        <ThemeToggle />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  )
}
