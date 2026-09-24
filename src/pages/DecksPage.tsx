import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { buttonPrimaryClassName } from '../components/Button'
import { TabPanel, Tabs } from '../components/Tabs'
import { languageLabel, sharerNameFromEmail, visibilityLabel } from '../lib/deckLabels'
import { supabase } from '../lib/supabase'
import type { Deck, Profile } from '../types/database'

type DeckListRow = Deck & {
  vocab_items: { count: number }[] | null
}

type DeckTab = 'mine' | 'public'

function vocabCount(deck: DeckListRow): number {
  return deck.vocab_items?.[0]?.count ?? 0
}

function isOwned(deck: DeckListRow, userId: string | null): boolean {
  return userId !== null && deck.owner_id === userId
}

export function DecksPage() {
  const location = useLocation()
  const successMessage = (location.state as { success?: string } | null)?.success

  const [userId, setUserId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckListRow[]>([])
  const [emailByOwnerId, setEmailByOwnerId] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DeckTab>(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    return tab === 'public' ? 'public' : 'mine'
  })

  useEffect(() => {
    let cancelled = false

    async function loadDecks() {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setError('Không có phiên đăng nhập.')
          setUserId(null)
          setDecks([])
          setEmailByOwnerId(new Map())
          setLoading(false)
        }
        return
      }

      if (cancelled) return
      setUserId(user.id)

      // Two queries: decks.owner_id FKs auth.users, not profiles — PostgREST cannot embed profiles(email).
      const { data, error: fetchError } = await supabase
        .from('decks')
        .select('*, vocab_items(count)')
        .order('created_at', { ascending: false })

      if (cancelled) return

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
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', ownerIds)

        if (profilesError) {
          console.error(profilesError)
        } else {
          emailMap = new Map(((profilesData ?? []) as Profile[]).map((p) => [p.id, p.email]))
        }
      }

      if (cancelled) return

      setDecks(deckRows)
      setEmailByOwnerId(emailMap)
      setLoading(false)
    }

    void loadDecks()
    return () => {
      cancelled = true
    }
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
    const owned = isOwned(deck, userId)
    return activeTab === 'mine' ? owned : !owned
  })

  const mineCount = decks.filter((deck) => isOwned(deck, userId)).length
  const publicCount = decks.filter((deck) => !isOwned(deck, userId)).length

  const textActionBase =
    'inline-flex min-h-8 items-center px-2 text-sm text-[var(--color-text-muted)] no-underline dark:text-[var(--color-text-muted-dark)]'
  const textActionClass = `${textActionBase} hover:text-[var(--color-text)] dark:hover:text-[var(--color-text-dark)]`
  const deleteActionClass = `${textActionBase} hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-[var(--color-danger-dark)]`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="mb-0">Decks</h1>
        <Link to="/decks/new" className={`${buttonPrimaryClassName} no-underline`}>
          Tạo deck mới
        </Link>
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        Mỗi ngày vào một hoặc vài deck để học từ mới và ôn bài, sau đó vào Ôn tập để ôn thêm một lượt.
      </p>

      <Tabs
        idPrefix="decks"
        ariaLabel="Loại deck"
        value={activeTab}
        onChange={setActiveTab}
        className="mt-6"
        tabs={[
          { id: 'mine', label: 'Cá nhân', count: loading ? undefined : mineCount },
          { id: 'public', label: 'Public', count: loading ? undefined : publicCount },
        ]}
      />

      {successMessage ? (
        <p
          role="status"
          className="mt-4 text-sm text-[var(--color-success)] dark:text-[var(--color-success-dark)]"
        >
          {successMessage}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
          {error}
        </p>
      ) : null}

      <TabPanel idPrefix="decks" labelledBy={activeTab} className="mt-6">
        {loading ? (
          <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
            Đang tải...
          </p>
        ) : (
          <>
            {activeTab === 'public' ? (
              <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                Deck công khai của người khác. Bấm vào để xem trước, rồi clone về để học.
              </p>
            ) : null}
            {visibleDecks.length === 0 ? (
          <p
            className={`text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]${activeTab === 'public' ? ' mt-2' : ''}`}
          >
            {activeTab === 'mine' ? (
              <>
                Bạn chưa có deck nào.{' '}
                <Link
                  to="/decks/new"
                  className="text-[var(--color-accent)] underline decoration-1 underline-offset-2 hover:text-[var(--color-accent-hover)] dark:text-[var(--color-accent-dark)]"
                >
                  Tạo deck mới
                </Link>{' '}
                để bắt đầu.
              </>
            ) : (
              'Chưa có deck công khai nào.'
            )}
          </p>
            ) : (
          <ul className={`list-none p-0${activeTab === 'public' ? ' mt-4' : ''}`}>
            {visibleDecks.map((deck) => {
              const owned = isOwned(deck, userId)
              const meta = owned
                ? `Nghĩa: ${languageLabel(deck.meaning_language)} · ${visibilityLabel(deck.visibility)}`
                : `Nghĩa: ${languageLabel(deck.meaning_language)} · Chia sẻ bởi ${sharerNameFromEmail(emailByOwnerId.get(deck.owner_id))}`

              return (
                <li
                  key={deck.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--color-border)] py-4 last:border-b-0 hover:bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:hover:bg-[var(--color-surface-dark)]"
                >
                  <Link
                    to={owned ? `/decks/${deck.id}` : `/decks/${deck.id}/preview`}
                    className="min-w-0 flex-1 no-underline"
                  >
                    <span className="block break-words font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                      {deck.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                      {meta}
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <span className="whitespace-nowrap text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                      {vocabCount(deck)} từ
                    </span>
                    {owned ? (
                      <>
                        <Link
                          to={`/decks/${deck.id}/edit`}
                          aria-label={`Sửa deck ${deck.name}`}
                          className={textActionClass}
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          aria-label={`Xóa deck ${deck.name}`}
                          disabled={deletingId === deck.id}
                          onClick={() => void handleDelete(deck)}
                          className={deleteActionClass}
                        >
                          {deletingId === deck.id ? 'Đang xóa…' : 'Xóa'}
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
            )}
          </>
        )}
      </TabPanel>
    </div>
  )
}
