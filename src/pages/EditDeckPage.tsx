import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { DeckForm } from '../components/DeckForm'
import { backLinkBlockClassName } from '../components/linkClasses'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

type PageStatus = 'loading' | 'notfound' | 'forbidden' | 'ready'

export function EditDeckPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [status, setStatus] = useState<PageStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [meaningLanguage, setMeaningLanguage] = useState<Deck['meaning_language']>('vi')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Deck['visibility']>('private')
  const [activePoolSize, setActivePoolSize] = useState(20)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const poolSizeValid =
    Number.isInteger(activePoolSize) && activePoolSize >= 10 && activePoolSize <= 30

  const canSave = name.trim() !== '' && poolSizeValid && !saving

  useEffect(() => {
    let cancelled = false

    async function loadDeck() {
      if (!id) {
        if (!cancelled) setStatus('notfound')
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setLoadError('Không có phiên đăng nhập.')
          setStatus('notfound')
        }
        return
      }

      const { data, error } = await supabase.from('decks').select('*').eq('id', id).single()

      if (cancelled) return

      if (error || !data) {
        setStatus('notfound')
        return
      }

      const deck = data as Deck
      if (deck.owner_id !== user.id) {
        setStatus('forbidden')
        return
      }

      setUserId(user.id)
      setName(deck.name)
      setMeaningLanguage(deck.meaning_language)
      setDescription(deck.description ?? '')
      setVisibility(deck.visibility)
      setActivePoolSize(deck.active_pool_size)
      setStatus('ready')
    }

    void loadDeck()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || !id || !userId) return

    setSaving(true)
    setSaveError(null)

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    const { error } = await supabase
      .from('decks')
      .update({
        name: trimmedName,
        meaning_language: meaningLanguage,
        description: trimmedDescription === '' ? null : trimmedDescription,
        visibility,
        active_pool_size: activePoolSize,
      })
      .eq('id', id)

    if (error) {
      console.error(error)
      setSaveError('Không lưu được thay đổi. Thử lại sau.')
      setSaving(false)
      return
    }

    navigate('/decks', { replace: true, state: { success: `Đã cập nhật deck «${trimmedName}».` } })
  }

  if (status === 'loading') {
    return (
      <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">Đang tải...</p>
    )
  }

  if (status === 'notfound') {
    return (
      <div>
        <p>
          <Link to="/decks" className={backLinkBlockClassName}>
            ← Decks
          </Link>
        </p>
        <h1>Sửa deck</h1>
        <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          {loadError ?? 'Không tìm thấy deck.'}
        </p>
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <div>
        <p>
          <Link to="/decks" className={backLinkBlockClassName}>
            ← Decks
          </Link>
        </p>
        <h1>Sửa deck</h1>
        <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Bạn không có quyền sửa deck này.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p>
        <Link to="/decks" className={backLinkBlockClassName}>
          ← Decks
        </Link>
      </p>
      <h1>Sửa deck</h1>

      <form className="mt-6" onSubmit={(e) => void handleSave(e)}>
        <DeckForm
          values={{ name, meaningLanguage, description, visibility, activePoolSize }}
          onNameChange={setName}
          onMeaningLanguageChange={setMeaningLanguage}
          onDescriptionChange={setDescription}
          onVisibilityChange={setVisibility}
          onActivePoolSizeChange={setActivePoolSize}
          poolSizeValid={poolSizeValid}
          showEditPoolHint
          disabled={saving}
        />

        {saveError ? (
          <p role="alert" className="mt-6 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
            {saveError}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-2">
          <Button type="submit" variant="primary" loading={saving} disabled={!canSave}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => navigate('/decks')}>
            Hủy
          </Button>
        </div>
      </form>
    </div>
  )
}
