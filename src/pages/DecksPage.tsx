import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Deck, Profile } from '../types/database'

type DeckListRow = Deck & {
  vocab_items: { count: number }[] | null
}

function vocabCount(deck: DeckListRow): number {
  return deck.vocab_items?.[0]?.count ?? 0
}

function languageLabel(code: Deck['meaning_language']): string {
  return code === 'en' ? 'Nghĩa: Anh' : 'Nghĩa: Việt'
}

function sharerNameFromEmail(email: string | null | undefined): string {
  if (!email) return 'Ẩn danh'
  const atIndex = email.indexOf('@')
  return atIndex === -1 ? email : email.slice(0, atIndex)
}

export function DecksPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const successMessage = (location.state as { success?: string } | null)?.success

  const [userId, setUserId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckListRow[]>([])
  const [emailByOwnerId, setEmailByOwnerId] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine')

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
      setEmailByOwnerId(new Map())
      setLoading(false)
      return
    }

    setUserId(user.id)

    // Two queries: decks.owner_id FKs auth.users, not profiles — PostgREST cannot embed profiles(email).
    const { data, error: fetchError } = await supabase
      .from('decks')
      .select('*, vocab_items(count)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setDecks([])
      setEmailByOwnerId(new Map())
      setLoading(false)
      return
    }

    const deckRows = (data ?? []) as DeckListRow[]
    const ownerIds = [...new Set(deckRows.map((d) => d.owner_id))]

    let emailMap = new Map<string, string>()
    if (ownerIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, email').in('id', ownerIds)
      emailMap = new Map(((profilesData ?? []) as Profile[]).map((p) => [p.id, p.email]))
    }

    setDecks(deckRows)
    setEmailByOwnerId(emailMap)
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

  const visibleDecks = decks.filter((deck) => {
    const owned = userId !== null && deck.owner_id === userId
    return activeTab === 'mine' ? owned : !owned
  })

  return (
    <main>
      <p>
        <Link to="/">← Trang chủ</Link>
      </p>
      <h1>Decks</h1>
      <p>
        <Link to="/decks/new">Tạo deck mới</Link>
      </p>

      <p>
        <button
          type="button"
          onClick={() => setActiveTab('mine')}
          style={{ fontWeight: activeTab === 'mine' ? 'bold' : 'normal' }}
        >
          Cá nhân
        </button>{' '}
        <button
          type="button"
          onClick={() => setActiveTab('public')}
          style={{ fontWeight: activeTab === 'public' ? 'bold' : 'normal' }}
        >
          Public
        </button>
      </p>

      {successMessage ? <p>{successMessage}</p> : null}
      {error ? <p>{error}</p> : null}

      {loading ? (
        <p>Đang tải...</p>
      ) : visibleDecks.length === 0 ? (
        <p>
          {activeTab === 'mine'
            ? 'Bạn chưa có deck nào. Tạo deck mới để bắt đầu.'
            : 'Chưa có deck công khai nào.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {visibleDecks.map((deck) => {
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
                <Link
                  to={owned ? `/decks/${deck.id}` : `/decks/${deck.id}/preview`}
                  style={{ display: 'block' }}
                >
                  <strong>{deck.name}</strong>
                  <span style={{ display: 'block' }}>{vocabCount(deck)} từ</span>
                  <span style={{ display: 'block' }}>
                    {deck.visibility === 'public' ? 'public' : 'private'} ·{' '}
                    {languageLabel(deck.meaning_language)}
                  </span>
                  {!owned ? (
                    <span style={{ display: 'block' }}>
                      Chia sẻ bởi: {sharerNameFromEmail(emailByOwnerId.get(deck.owner_id))}
                    </span>
                  ) : null}
                </Link>
                {owned ? (
                  <p>
                    <button type="button" onClick={() => navigate(`/decks/${deck.id}/edit`)}>
                      Sửa
                    </button>{' '}
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
