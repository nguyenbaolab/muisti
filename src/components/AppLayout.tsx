import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from './Button'
import { ThemeToggle } from './ThemeToggle'

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'text-[var(--color-text)] underline decoration-1 underline-offset-4 dark:text-[var(--color-text-dark)]'
    : 'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]'
}

export function AppLayout() {
  const [showAdminLink, setShowAdminLink] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAdminFlag() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setShowAdminLink(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data?.is_admin) {
        setShowAdminLink(false)
        return
      }

      setShowAdminLink(true)
    }

    void loadAdminFlag()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-svh">
      <header className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3 sm:px-6">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
            <Link
              to="/"
              className="text-base font-semibold text-[var(--color-text)] no-underline dark:text-[var(--color-text-dark)]"
            >
              Muisti
            </Link>
            <nav className="flex gap-4 text-sm">
              <NavLink to="/decks" className={navClass} title="Xem và học các deck của bạn">
                Decks
              </NavLink>
              <NavLink to="/review" className={navClass} title="Ôn các từ đến hạn trong mọi deck">
                Ôn tập
              </NavLink>
              {showAdminLink ? (
                <NavLink to="/admin" className={navClass} title="Quản lý quota và quyền admin">
                  Admin
                </NavLink>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="secondary"
              className="px-3 py-1.5"
              onClick={() => void supabase.auth.signOut()}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
