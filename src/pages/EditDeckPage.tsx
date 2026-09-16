import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
      setSaveError(error.message)
      setSaving(false)
      return
    }

    navigate('/decks', { replace: true, state: { success: `Đã cập nhật deck «${trimmedName}».` } })
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

  if (status === 'notfound') {
    return (
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <h1>Sửa deck</h1>
        <p>{loadError ?? 'Không tìm thấy deck.'}</p>
      </main>
    )
  }

  if (status === 'forbidden') {
    return (
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <h1>Sửa deck</h1>
        <p>Bạn không có quyền sửa deck này.</p>
      </main>
    )
  }

  return (
    <main>
      <p>
        <Link to="/decks">← Decks</Link>
      </p>
      <h1>Sửa deck</h1>

      <form onSubmit={(e) => void handleSave(e)}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Tên deck
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', maxWidth: 480, marginTop: 4 }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Ngôn ngữ nghĩa
          <select
            value={meaningLanguage}
            onChange={(e) => setMeaningLanguage(e.target.value as Deck['meaning_language'])}
            required
            style={{ display: 'block', marginTop: 4 }}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Mô tả (không bắt buộc)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ display: 'block', width: '100%', maxWidth: 480, marginTop: 4 }}
          />
        </label>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 12px' }}>
          <legend>Visibility</legend>
          <label style={{ display: 'block' }}>
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />{' '}
            private
          </label>
          <label style={{ display: 'block' }}>
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />{' '}
            public
          </label>
        </fieldset>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Số từ học cùng lúc
          <input
            type="number"
            min={10}
            max={30}
            step={1}
            value={activePoolSize}
            onChange={(e) => setActivePoolSize(Number(e.target.value))}
            required
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
        <p style={{ marginTop: -8, marginBottom: 12, maxWidth: 480 }}>
          Hệ thống tự thêm từ mới khi bạn đã học vững các từ đang ôn.
        </p>
        {!poolSizeValid ? (
          <p style={{ color: 'crimson' }}>Nhập số nguyên từ 10 đến 30.</p>
        ) : null}

        {saveError ? <p style={{ color: 'crimson' }}>{saveError}</p> : null}

        <p>
          <button type="submit" disabled={!canSave}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>{' '}
          <button type="button" onClick={() => navigate('/decks')} disabled={saving}>
            Hủy
          </button>
        </p>
      </form>
    </main>
  )
}
