import { supabase } from '../lib/supabase'

export function AppShell() {
  return (
    <main>
      <h1>Muisti</h1>
      <button type="button" onClick={() => void supabase.auth.signOut()}>
        Đăng xuất
      </button>
    </main>
  )
}
