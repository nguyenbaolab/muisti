import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayLocalIsoDate } from '../lib/srs'
import type { Deck } from '../types/database'

type PageStatus = 'loading' | 'notfound' | 'forbidden' | 'error' | 'ready'
type ActiveTab = 'words' | 'summary'
type WordStatus = 'Chưa học' | 'Đang học' | 'Đã thuộc'

type VocabRow = {
  id: string
  finnish_word: string
  translation: string
}

type ProgressRow = {
  vocab_item_id: string
  interval_days: number
  due_date: string
  last_reviewed_at: string | null
}

type WordRow = VocabRow & {
  status: WordStatus
}

function languageLabel(code: Deck['meaning_language']): string {
  return code === 'en' ? 'Anh' : 'Việt'
}

function wordStatus(intervalDays: number | undefined): WordStatus {
  if (intervalDays === undefined) return 'Chưa học'
  if (intervalDays >= 30) return 'Đã thuộc'
  return 'Đang học'
}

function localIsoDateFromTimestamp(iso: string): string {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [status, setStatus] = useState<PageStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<WordRow[]>([])
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('words')

  useEffect(() => {
    let cancelled = false

    async function loadDetail() {
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

      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (deckError || !deckData) {
        setStatus('notfound')
        return
      }

      const loadedDeck = deckData as Deck
      if (loadedDeck.owner_id !== user.id) {
        setStatus('forbidden')
        return
      }

      const [vocabResult, progressResult] = await Promise.all([
        supabase
          .from('vocab_items')
          .select('id, finnish_word, translation')
          .eq('deck_id', id),
        supabase
          .from('user_vocab_progress')
          .select('vocab_item_id, interval_days, due_date, last_reviewed_at, vocab_items!inner(deck_id)')
          .eq('user_id', user.id)
          .eq('vocab_items.deck_id', id),
      ])

      if (cancelled) return

      if (vocabResult.error || progressResult.error) {
        setLoadError(vocabResult.error?.message ?? progressResult.error?.message ?? 'Không tải được dữ liệu.')
        setStatus('error')
        return
      }

      const vocabItems = (vocabResult.data ?? []) as VocabRow[]
      const progress = (progressResult.data ?? []) as ProgressRow[]
      const intervalByVocabId = new Map(progress.map((row) => [row.vocab_item_id, row.interval_days]))

      setDeck(loadedDeck)
      setProgressRows(progress)
      setWords(
        vocabItems.map((item) => ({
          ...item,
          status: wordStatus(intervalByVocabId.get(item.id)),
        })),
      )
      setStatus('ready')
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [id])

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
        <h1>Deck</h1>
        <p>Không tìm thấy deck.</p>
      </main>
    )
  }

  if (status === 'forbidden') {
    return (
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <h1>Deck</h1>
        <p>Bạn không có quyền xem trang này. Trang chi tiết chỉ dành cho chủ deck.</p>
        {id ? (
          <p>
            <Link to={`/decks/${id}/preview`}>Xem trước deck</Link>
          </p>
        ) : null}
      </main>
    )
  }

  if (status === 'error' || !deck || !id) {
    return (
      <main>
        <p>
          <Link to="/decks">← Decks</Link>
        </p>
        <h1>Deck</h1>
        <p>{loadError ?? 'Không tải được dữ liệu.'}</p>
      </main>
    )
  }

  const today = todayLocalIsoDate()
  const totalWords = words.length
  const enrolledProgress = progressRows.length
  const notEnrolledCount = totalWords - enrolledProgress
  const graduatedCount = progressRows.filter((p) => p.interval_days >= 30).length
  const activeCount = progressRows.filter((p) => p.interval_days < 30).length
  const dueTodayCount = progressRows.filter((p) => p.due_date <= today).length
  const startedLabel = new Date(deck.created_at).toLocaleDateString('vi-VN')
  const reviewedDates = new Set(
    progressRows
      .filter((p) => p.last_reviewed_at !== null)
      .map((p) => localIsoDateFromTimestamp(p.last_reviewed_at as string)),
  )
  const estimatedDaysStudied = reviewedDates.size

  return (
    <main>
      <p>
        <Link to="/decks">← Decks</Link>
      </p>
      <h1>{deck.name}</h1>
      {deck.description ? <p>{deck.description}</p> : null}
      <p>
        Nghĩa: {languageLabel(deck.meaning_language)} · {totalWords} từ
      </p>

      <p>
        <button
          type="button"
          disabled={activeTab === 'words'}
          onClick={() => setActiveTab('words')}
        >
          Từ vựng
        </button>{' '}
        <button
          type="button"
          disabled={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
        >
          Tổng kết
        </button>{' '}
        <Link to={`/review/${id}`}>Bắt đầu ôn tập</Link>
      </p>

      {activeTab === 'words' ? (
        <table>
          <thead>
            <tr>
              <th>Tiếng Phần Lan</th>
              <th>Nghĩa</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {words.map((item) => (
              <tr key={item.id}>
                <td>{item.finnish_word}</td>
                <td>{item.translation}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <ul>
            <li>Tổng số từ: {totalWords}</li>
            <li>
              Đã học: {enrolledProgress} / Chưa học: {notEnrolledCount}
            </li>
            <li>
              Đã thuộc: {graduatedCount} / Đang học: {activeCount}
            </li>
            <li>Due hôm nay: {dueTodayCount}</li>
          </ul>
          <p>Bắt đầu học từ: {startedLabel} (ước lượng theo ngày tạo deck)</p>
          <p>Số ngày đã ôn (ước lượng): {estimatedDaysStudied} ngày</p>
          <p>
            <small>
              Số liệu ước lượng dựa trên lần ôn gần nhất của mỗi từ, có thể thấp hơn thực tế.
            </small>
          </p>
        </>
      )}
    </main>
  )
}
