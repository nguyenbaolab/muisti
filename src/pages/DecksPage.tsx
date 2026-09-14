import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

type DeckListRow = Deck & {
  vocab_items: { count: number }[] | null
}

function vocabCount(deck: DeckListRow): number {
  return deck.vocab_items?.[0]?.count ?? 0
}

function languageLabel(code: Deck['meaning_language']): string {
  return code === 'en' ? 'Nghĩa: Anh' : 'Nghĩa: Việt'
}

export function DecksPage() {
  const location = useLocation()
  const successMessage = (location.state as { success?: string } | null)?.success

  const [userId, setUserId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadDecks() {
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Không có phiên đăng nhập.')
      setUserId(null)
      setDecks([])
      setLoading(false)
      return
    }

    setUserId(user.id)

    const { data, error: fetchError } = await supabase
      .from('decks')
      .select('*, vocab_items(count)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setDecks([])
    } else {
      setDecks((data ?? []) as DeckListRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadDecks()
  }, [])

  async function handleDelete(deck: DeckListRow) {
    const ok = window.confirm(
      'Xóa deck sẽ xóa luôn toàn bộ từ vựng và tiến độ ôn tập. Không thể hoàn tác. Tiếp tục?',
    )
    if (!ok) return

    setDeletingId(deck.id)
    setError(null)

    const { error: deleteError } = await supabase.from('decks').delete().eq('id', deck.id)
    setDeletingId(null)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setDecks((prev) => prev.filter((row) => row.id !== deck.id))
  }

  return (
    <main>
      <p>
        <Link to="/">← Trang chủ</Link>
      </p>
      <h1>Decks</h1>
      <p>
        <Link to="/decks/new">Tạo deck mới</Link>
      </p>

      {successMessage ? <p>{successMessage}</p> : null}
      {error ? <p>{error}</p> : null}

      {loading ? (
        <p>Đang tải...</p>
      ) : decks.length === 0 ? (
        <p>Chưa có deck nào. Tạo deck mới để bắt đầu.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {decks.map((deck) => {
            const owned = userId !== null && deck.owner_id === userId
            return (
              <li
                key={deck.id}
                style={{
                  border: '1px solid var(--border)',
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Link to={`/review/${deck.id}`} style={{ display: 'block' }}>
                  <strong>{deck.name}</strong>
                  <span style={{ display: 'block' }}>{vocabCount(deck)} từ</span>
                  <span style={{ display: 'block' }}>
                    {deck.visibility === 'public' ? 'public' : 'private'} ·{' '}
                    {languageLabel(deck.meaning_language)}
                  </span>
                </Link>
                {owned ? (
                  <p>
                    <button
                      type="button"
                      disabled={deletingId === deck.id}
                      onClick={() => void handleDelete(deck)}
                    >
                      {deletingId === deck.id ? 'Đang xóa…' : 'Xóa'}
                    </button>
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
