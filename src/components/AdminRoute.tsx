import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type GateStatus = 'loading' | 'allowed' | 'denied'

/**
 * Nested under AppLayout + session gate. Allows outlet only when
 * profiles.is_admin is true for the current user.
 */
export function AdminRoute() {
  const [status, setStatus] = useState<GateStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) setStatus('denied')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (error || !data?.is_admin) {
        setStatus('denied')
        return
      }

      setStatus('allowed')
    }

    void checkAdmin()
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') {
    return (
      <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        Đang tải...
      </p>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
