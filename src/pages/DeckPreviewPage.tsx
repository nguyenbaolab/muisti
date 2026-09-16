import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

type PreviewVocab = {
  finnish_word: string
  translation: string
}

type PreviewDeck = Deck & {
  vocab_items: PreviewVocab[] | null
}

type PageStatus = 'loading' | 'notfound' | 'ready'

function languageLabel(code: Deck['meaning_language']): string {
  return code === 'en' ? 'Anh' : 'Việt'
}

export function DeckPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [status, setStatus] = useState<PageStatus>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [deck, setDeck] = useState<PreviewDeck | null>(null)
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
        .select('*, vocab_items(finnish_word, translation)')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (error || !data) {
        setStatus('notfound')
        return
      }

      setUserId(user.id)
      setDeck(data as PreviewDeck)
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
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <p>Đang tải...</p>
      </main>
    )
  }

  if (status === 'notfound' || !deck) {
    return (
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <h1>Xem trước deck</h1>
        <p>Không tìm thấy deck hoặc bạn không có quyền xem.</p>
      </main>
    )
  }

  const vocab = deck.vocab_items ?? []
  const owned = userId !== null && deck.owner_id === userId

  return (
    <main>
      <p>
        <Link to="/decks">← Decks</Link>
      </p>
      <h1>{deck.name}</h1>
      {deck.description ? <p>{deck.description}</p> : null}
      <p>
        Nghĩa: {languageLabel(deck.meaning_language)} · {vocab.length} từ
      </p>

      {owned ? (
        <p>
          Đây là deck của bạn.{' '}
          <Link to={`/review/${deck.id}`}>Bắt đầu ôn tập</Link>
        </p>
      ) : (
        <p>
          <button type="button" disabled={cloning} onClick={() => void handleClone()}>
            {cloning ? 'Đang clone…' : 'Clone về deck của tôi'}
          </button>
        </p>
      )}

      {cloneError ? <p style={{ color: 'crimson' }}>{cloneError}</p> : null}

      <table>
        <thead>
          <tr>
            <th>Tiếng Phần Lan</th>
            <th>Nghĩa</th>
          </tr>
        </thead>
        <tbody>
          {vocab.map((item, index) => (
            <tr key={`${item.finnish_word}-${index}`}>
              <td>{item.finnish_word}</td>
              <td>{item.translation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
