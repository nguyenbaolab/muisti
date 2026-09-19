import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, buttonPrimaryClassName } from '../components/Button'
import { DeckHeader } from '../components/DeckHeader'
import { VocabTable } from '../components/VocabTable'
import { sharerNameFromEmail } from '../lib/deckLabels'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

type PreviewVocab = {
  id: string
  finnish_word: string
  translation: string
  created_at: string
}

type PreviewDeck = Deck & {
  vocab_items: PreviewVocab[] | null
}

type PageStatus = 'loading' | 'notfound' | 'ready'

const backLinkClassName =
  'mb-4 inline-block text-base text-[var(--color-text-muted)] no-underline hover:text-[var(--color-text)] dark:text-[var(--color-text-muted-dark)] dark:hover:text-[var(--color-text-dark)]'

export function DeckPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [status, setStatus] = useState<PageStatus>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [deck, setDeck] = useState<PreviewDeck | null>(null)
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!id) {
        if (!cancelled) setStatus('notfound')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setStatus('notfound')
        return
      }

      const { data, error } = await supabase
        .from('decks')
        .select('*, vocab_items(id, finnish_word, translation, created_at)')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (error || !data) {
        setStatus('notfound')
        return
      }

      const loadedDeck = data as PreviewDeck
      const vocabItems = [...(loadedDeck.vocab_items ?? [])].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      )
      loadedDeck.vocab_items = vocabItems

      let email: string | null = null
      if (loadedDeck.owner_id !== user.id) {
        const { data: profileData, error: profilesError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', loadedDeck.owner_id)
          .single()

        if (profilesError) {
          console.error(profilesError)
        } else {
          email = (profileData as { email: string } | null)?.email ?? null
        }
      }

      if (cancelled) return

      setUserId(user.id)
      setDeck(loadedDeck)
      setOwnerEmail(email)
      setStatus('ready')
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleClone() {
    if (!deck || !userId || cloning) return

    setCloning(true)
    setCloneError(null)

    const copyName = `${deck.name} (Copy)`

    const { data: newDeck, error: insertDeckError } = await supabase
      .from('decks')
      .insert({
        owner_id: userId,
        name: copyName,
        meaning_language: deck.meaning_language,
        description: deck.description,
        visibility: 'private',
        active_pool_size: 20,
      })
      .select('id')
      .single()

    if (insertDeckError || !newDeck) {
      setCloneError(insertDeckError?.message ?? 'Không clone được deck.')
      setCloning(false)
      return
    }

    const rows = (deck.vocab_items ?? []).map((item) => ({
      deck_id: newDeck.id as string,
      finnish_word: item.finnish_word,
      translation: item.translation,
    }))

    const { error: insertVocabError } = await supabase.from('vocab_items').insert(rows)

    if (insertVocabError) {
      await supabase.from('decks').delete().eq('id', newDeck.id)
      setCloneError(insertVocabError.message)
      setCloning(false)
      return
    }

    navigate('/decks', { replace: true, state: { success: `Đã clone deck «${copyName}».` } })
  }

  if (status === 'loading') {
    return (
      <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">Đang tải...</p>
    )
  }

  if (status === 'notfound' || !deck) {
    return (
      <div>
        <h1>Xem trước deck</h1>
        <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Không tìm thấy deck hoặc bạn không có quyền xem.
        </p>
        <p className="mt-4">
          <Link to="/decks" className={backLinkClassName}>
            ← Decks
          </Link>
        </p>
      </div>
    )
  }

  const vocab = deck.vocab_items ?? []
  const owned = userId !== null && deck.owner_id === userId

  return (
    <div>
      <p>
        <Link to="/decks" className={backLinkClassName}>
          ← Decks
        </Link>
      </p>

      <DeckHeader
        name={deck.name}
        description={deck.description}
        meaningLanguage={deck.meaning_language}
        wordCount={vocab.length}
        visibility={owned ? deck.visibility : undefined}
        sharedBy={owned ? undefined : sharerNameFromEmail(ownerEmail)}
        actions={
          owned ? (
            <Link to={`/review/${deck.id}`} className={`${buttonPrimaryClassName} no-underline`}>
              Bắt đầu ôn tập
            </Link>
          ) : (
            <Button variant="primary" loading={cloning} onClick={() => void handleClone()}>
              {cloning ? 'Đang clone…' : 'Clone về deck của tôi'}
            </Button>
          )
        }
      />

      {owned ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Đây là deck của bạn.
        </p>
      ) : null}

      {cloneError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
          {cloneError}
        </p>
      ) : null}

      <div className="mt-8">
        <VocabTable items={vocab} caption={`Danh sách từ vựng của deck ${deck.name}`} />
      </div>
    </div>
  )
}
