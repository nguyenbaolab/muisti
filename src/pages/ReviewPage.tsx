import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeNextReview, todayLocalIsoDate } from '../lib/srs'
import type { ReviewQueueItem, VocabItem } from '../types/database'

type PageState = 'setup' | 'loading' | 'reviewing' | 'empty' | 'done' | 'error'
type AskMode = 'type' | 'mcq'

type SessionCard = ReviewQueueItem & { wrongCount: number }

type ProgressJoinRow = {
  id: string
  vocab_item_id: string
  ease_factor: number
  interval_days: number
  review_count: number
  vocab_items: VocabItem | VocabItem[] | null
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase()
}

function pickMode(enabled: AskMode[]): AskMode {
  return enabled[Math.floor(Math.random() * enabled.length)]
}

function pickMcqOptions(correct: string, pool: string[]): string[] | null {
  const seen = new Set<string>()
  const distractors: string[] = []
  const correctNorm = normalizeAnswer(correct)

  for (const word of shuffle(pool)) {
    const norm = normalizeAnswer(word)
    if (!norm || norm === correctNorm || seen.has(norm)) continue
    seen.add(norm)
    distractors.push(word)
    if (distractors.length === 3) break
  }

  if (distractors.length < 3) return null
  return shuffle([correct, ...distractors])
}

function mapQueueRow(row: ProgressJoinRow): ReviewQueueItem | null {
  const vocab = Array.isArray(row.vocab_items) ? row.vocab_items[0] : row.vocab_items
  if (!vocab) return null
  return {
    progressId: row.id,
    vocabItemId: row.vocab_item_id,
    finnishWord: vocab.finnish_word,
    translation: vocab.translation,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    reviewCount: row.review_count,
  }
}

/** Schema defaults on user_vocab_progress: ease_factor 2.5, interval_days 0, review_count 0. */
const ENROLL_EASE_FACTOR = 2.5
const ENROLL_INTERVAL_DAYS = 0
const ENROLL_REVIEW_COUNT = 0

async function enrollActivePool(
  userId: string,
  deckId: string,
  todayIso: string,
): Promise<{ fatalError: string | null }> {
  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select('active_pool_size')
    .eq('id', deckId)
    .single()

  if (deckError) {
    return { fatalError: deckError.message }
  }

  const poolSize = deckData?.active_pool_size as number

  const { data: activeRows, error: activeError } = await supabase
    .from('user_vocab_progress')
    .select('id, vocab_items!inner(deck_id)')
    .eq('user_id', userId)
    .eq('vocab_items.deck_id', deckId)
    .lt('interval_days', 30)

  if (activeError) {
    return { fatalError: null }
  }

  const activeCount = (activeRows ?? []).length
  const needed = poolSize - activeCount
  if (needed <= 0) {
    return { fatalError: null }
  }

  const { data: existingProgress, error: existingError } = await supabase
    .from('user_vocab_progress')
    .select('vocab_item_id, vocab_items!inner(deck_id)')
    .eq('user_id', userId)
    .eq('vocab_items.deck_id', deckId)

  const { data: allVocabItems, error: vocabIdsError } = await supabase
    .from('vocab_items')
    .select('id')
    .eq('deck_id', deckId)

  if (existingError || vocabIdsError) {
    return { fatalError: null }
  }

  const enrolled = new Set(
    ((existingProgress ?? []) as { vocab_item_id: string }[]).map((row) => row.vocab_item_id),
  )
  const candidates = shuffle(
    ((allVocabItems ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !enrolled.has(id)),
  )
  const selected = candidates.slice(0, needed)
  if (selected.length === 0) {
    return { fatalError: null }
  }

  const { error: insertError } = await supabase.from('user_vocab_progress').insert(
    selected.map((vocabItemId) => ({
      user_id: userId,
      vocab_item_id: vocabItemId,
      ease_factor: ENROLL_EASE_FACTOR,
      interval_days: ENROLL_INTERVAL_DAYS,
      due_date: todayIso,
      review_count: ENROLL_REVIEW_COUNT,
    })),
  )

  if (insertError) {
    return { fatalError: null }
  }

  return { fatalError: null }
}

export function ReviewPage() {
  const { deckId } = useParams<{ deckId?: string }>()
  const scopedDeckId = deckId?.trim() || null
  const reviewMode: 'mix' | 'deck' = scopedDeckId ? 'deck' : 'mix'

  const [pageState, setPageState] = useState<PageState>('setup')
  const [typeEnabled, setTypeEnabled] = useState(true)
  const [mcqEnabled, setMcqEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<SessionCard[]>([])
  const [sessionTotal, setSessionTotal] = useState(0)
  const [askMode, setAskMode] = useState<AskMode>('type')
  const [mcqOptions, setMcqOptions] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [finnishPool, setFinnishPool] = useState<string[]>([])

  const enabledModes: AskMode[] = [
    ...(typeEnabled ? (['type'] as const) : []),
    ...(mcqEnabled ? (['mcq'] as const) : []),
  ]

  function presentCard(nextQueue: SessionCard[], modes: AskMode[], pool: string[]) {
    const card = nextQueue[0]
    if (!card) return
    let mode = pickMode(modes)
    let options: string[] = []
    if (mode === 'mcq') {
      const mcq = pickMcqOptions(card.finnishWord, pool)
      if (mcq) {
        options = mcq
      } else {
        // Fewer than 3 unique distractors (after excluding the correct
        // answer and duplicates) — cannot build a 4-choice MCQ. Fall
        // back to typing for this prompt only, even if setup was MCQ-only.
        mode = 'type'
      }
    }
    setAskMode(mode)
    setMcqOptions(options)
    setTypedAnswer('')
    setSelectedOption(null)
    setFeedback(null)
    setError(null)
  }

  async function startReview() {
    if (enabledModes.length === 0) return

    setPageState('loading')
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Không có phiên đăng nhập.')
      setPageState('error')
      return
    }

    const today = todayLocalIsoDate()

    if (scopedDeckId) {
      const enroll = await enrollActivePool(user.id, scopedDeckId, today)
      if (enroll.fatalError) {
        setError(enroll.fatalError)
        setPageState('error')
        return
      }
    }

    // Mix: all own due progress rows, no extra deck/visibility join.
    // Deck: due rows whose vocab belongs to that deck (inner join).
    let progressQuery = supabase
      .from('user_vocab_progress')
      .select(
        scopedDeckId
          ? 'id, vocab_item_id, ease_factor, interval_days, review_count, vocab_items!inner(*)'
          : 'id, vocab_item_id, ease_factor, interval_days, review_count, vocab_items(*)',
      )
      .eq('user_id', user.id)
      .lte('due_date', today)

    if (scopedDeckId) {
      progressQuery = progressQuery.eq('vocab_items.deck_id', scopedDeckId)
    }

    let vocabQuery = supabase.from('vocab_items').select('finnish_word')
    if (scopedDeckId) {
      vocabQuery = vocabQuery.eq('deck_id', scopedDeckId)
    }

    const [progressResult, vocabResult] = await Promise.all([progressQuery, vocabQuery])

    if (progressResult.error) {
      setError(progressResult.error.message)
      setPageState('error')
      return
    }
    if (vocabResult.error) {
      setError(vocabResult.error.message)
      setPageState('error')
      return
    }

    const items = ((progressResult.data ?? []) as ProgressJoinRow[])
      .map(mapQueueRow)
      .filter((item): item is ReviewQueueItem => item !== null)
      .map((item) => ({ ...item, wrongCount: 0 }))

    if (items.length === 0) {
      setQueue([])
      setSessionTotal(0)
      setPageState('empty')
      return
    }

    const pool = ((vocabResult.data ?? []) as Pick<VocabItem, 'finnish_word'>[]).map(
      (row) => row.finnish_word,
    )
    const shuffled = shuffle(items)
    setFinnishPool(pool)
    setSessionTotal(shuffled.length)
    setQueue(shuffled)
    presentCard(shuffled, enabledModes, pool)
    setPageState('reviewing')
  }

  async function persistCard(card: SessionCard): Promise<string | null> {
    const next = computeNextReview({
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      reviewCount: card.reviewCount,
      wrongCount: card.wrongCount,
    })

    const { error: updateError } = await supabase
      .from('user_vocab_progress')
      .update({
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        due_date: next.dueDate,
        review_count: card.reviewCount + 1,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', card.progressId)

    return updateError ? updateError.message : null
  }

  function checkAnswer(card: SessionCard): boolean {
    if (askMode === 'type') {
      return normalizeAnswer(typedAnswer) === normalizeAnswer(card.finnishWord)
    }
    return selectedOption !== null && selectedOption === card.finnishWord
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const card = queue[0]
    if (!card || feedback || saving) return
    if (askMode === 'mcq' && selectedOption === null) return
    if (askMode === 'type' && typedAnswer.trim() === '') return

    const correct = checkAnswer(card)
    if (!correct) {
      setQueue((prev) => {
        const current = prev[0]
        if (!current) return prev
        return [{ ...current, wrongCount: current.wrongCount + 1 }, ...prev.slice(1)]
      })
      setFeedback({ correct: false })
      return
    }

    setSaving(true)
    const persistError = await persistCard(card)
    setSaving(false)
    if (persistError) {
      setError(persistError)
      return
    }

    setFeedback({ correct: true })
  }

  function handleNext() {
    if (!feedback || saving) return

    if (feedback.correct) {
      const remaining = queue.slice(1)
      setQueue(remaining)
      if (remaining.length === 0) {
        setPageState('done')
        return
      }
      presentCard(remaining, enabledModes, finnishPool)
      return
    }

    const current = queue[0]
    if (!current) return
    const remaining = [...queue.slice(1), current]
    setQueue(remaining)
    presentCard(remaining, enabledModes, finnishPool)
  }

  const card = queue[0]

  if (pageState === 'setup') {
    return (
      <main>
        <p>
          <Link to="/">← Trang chủ</Link>
        </p>
        <h1>Ôn tập hôm nay</h1>
        <p>
          {reviewMode === 'deck'
            ? `Chế độ: ôn một deck (${scopedDeckId}).`
            : 'Chế độ: mix tất cả từ đang đến hạn.'}
        </p>
        <p>Chọn hình thức hỏi (có thể tick cả hai — mỗi từ random một hình thức):</p>
        <label>
          <input
            type="checkbox"
            checked={typeEnabled}
            onChange={(e) => setTypeEnabled(e.target.checked)}
          />{' '}
          Gõ chữ
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={mcqEnabled}
            onChange={(e) => setMcqEnabled(e.target.checked)}
          />{' '}
          Trắc nghiệm
        </label>
        <p>
          <button type="button" disabled={enabledModes.length === 0} onClick={() => void startReview()}>
            Bắt đầu ôn tập
          </button>
        </p>
      </main>
    )
  }

  if (pageState === 'loading') {
    return <p>Đang tải...</p>
  }

  if (pageState === 'error') {
    return (
      <main>
        <p>{error}</p>
        <p>
          <Link to="/">← Trang chủ</Link>
        </p>
      </main>
    )
  }

  if (pageState === 'empty') {
    return (
      <main>
        <p>Không có từ nào cần ôn hôm nay.</p>
        <p>
          <Link to="/">← Trang chủ</Link>
        </p>
      </main>
    )
  }

  if (pageState === 'done') {
    return (
      <main>
        <p>Hoàn thành! Đã ôn xong {sessionTotal} từ hôm nay.</p>
        <p>
          <Link to="/">← Trang chủ</Link>
        </p>
      </main>
    )
  }

  if (!card) {
    return <p>Đang tải...</p>
  }

  const canSubmit =
    !feedback &&
    !saving &&
    (askMode === 'type' ? typedAnswer.trim() !== '' : selectedOption !== null)

  return (
    <main>
      <p>
        <Link to="/">← Trang chủ</Link>
      </p>
      <h1>Ôn tập hôm nay</h1>
      <p>
        Còn {queue.length} từ trong phiên này.
      </p>
      <p>
        Nghĩa: <strong>{card.translation}</strong>
      </p>

      <form onSubmit={(e) => void handleSubmit(e)}>
        {askMode === 'type' ? (
          <label>
            Gõ từ tiếng Phần Lan
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              disabled={Boolean(feedback) || saving}
              autoComplete="off"
              style={{ display: 'block', marginTop: 4 }}
            />
          </label>
        ) : (
          <fieldset disabled={Boolean(feedback) || saving}>
            <legend>Chọn từ tiếng Phần Lan</legend>
            {mcqOptions.map((option) => (
              <label key={option} style={{ display: 'block' }}>
                <input
                  type="radio"
                  name="mcq"
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => setSelectedOption(option)}
                />{' '}
                {option}
              </label>
            ))}
          </fieldset>
        )}

        {error ? <p>{error}</p> : null}

        {!feedback ? (
          <p>
            <button type="submit" disabled={!canSubmit}>
              {saving ? 'Đang lưu…' : 'Trả lời'}
            </button>
          </p>
        ) : (
          <div>
            <p>{feedback.correct ? 'Đúng!' : 'Sai.'}</p>
            <p>
              Đáp án: <strong>{card.finnishWord}</strong>
            </p>
            <p>
              <button type="button" onClick={handleNext} disabled={saving}>
                Tiếp theo
              </button>
            </p>
          </div>
        )}
      </form>
    </main>
  )
}
