import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AppShell() {
  return (
    <main>
      <h1>Muisti</h1>
      <p>
        <Link to="/decks">Decks</Link>
      </p>
      <p>
        <Link to="/review">Ôn tập hôm nay</Link>
      </p>
      <button type="button" onClick={() => void supabase.auth.signOut()}>
        Đăng xuất
      </button>
    </main>
  )
}
