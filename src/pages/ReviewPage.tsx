import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, buttonPrimaryClassName, buttonSecondaryClassName } from '../components/Button'
import { FocusLayout } from '../components/FocusLayout'
import { Input } from '../components/Input'
import { backLinkClassName } from '../components/linkClasses'
import { VocabTable } from '../components/VocabTable'
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

const LOAD_ERROR_COPY = 'Không tải được dữ liệu ôn tập. Thử lại sau.'

const mutedTextClassName =
  'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]'

const checkboxClassName =
  'mt-1 accent-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] dark:accent-[var(--color-accent-dark)] dark:focus-visible:outline-[var(--color-accent-dark)]'

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
): Promise<{ fatalError: string | null; enrolledCount: number }> {
  const { data: deckData, error: deckError } = await supabase
    .from('decks')
    .select('active_pool_size')
    .eq('id', deckId)
    .single()

  if (deckError) {
    return { fatalError: deckError.message, enrolledCount: 0 }
  }

  const poolSize = deckData?.active_pool_size as number

  const { data: activeRows, error: activeError } = await supabase
    .from('user_vocab_progress')
    .select('id, vocab_items!inner(deck_id)')
    .eq('user_id', userId)
    .eq('vocab_items.deck_id', deckId)
    .lt('interval_days', 30)

  if (activeError) {
    return { fatalError: null, enrolledCount: 0 }
  }

  const activeCount = (activeRows ?? []).length
  const needed = poolSize - activeCount
  if (needed <= 0) {
    return { fatalError: null, enrolledCount: 0 }
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
    return { fatalError: null, enrolledCount: 0 }
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
    return { fatalError: null, enrolledCount: 0 }
  }

  const rowsToInsert = selected.map((vocabItemId) => ({
    user_id: userId,
    vocab_item_id: vocabItemId,
    ease_factor: ENROLL_EASE_FACTOR,
    interval_days: ENROLL_INTERVAL_DAYS,
    due_date: todayIso,
    review_count: ENROLL_REVIEW_COUNT,
  }))

  const { error: insertError } = await supabase.from('user_vocab_progress').insert(rowsToInsert)

  if (insertError) {
    return { fatalError: null, enrolledCount: 0 }
  }

  return { fatalError: null, enrolledCount: rowsToInsert.length }
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
  const [askMode, setAskMode] = useState<AskMode>('type')
  const [mcqOptions, setMcqOptions] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [finnishPool, setFinnishPool] = useState<string[]>([])
  const [completedCards, setCompletedCards] = useState<SessionCard[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [deckName, setDeckName] = useState<string | null>(null)
  const [ownerChecked, setOwnerChecked] = useState(() => !scopedDeckId)
  const typedInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!scopedDeckId) {
      setDeckName(null)
      setOwnerChecked(true)
      return
    }

    setDeckName(null)
    setOwnerChecked(false)

    let cancelled = false

    async function checkOwner() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: deckOwnerData, error: deckOwnerError } = await supabase
        .from('decks')
        .select('owner_id, name')
        .eq('id', scopedDeckId)
        .single()

      if (cancelled) return

      if (deckOwnerError || !deckOwnerData) {
        setError('Không tìm thấy deck.')
        setPageState('error')
        return
      }

      if (deckOwnerData.owner_id !== user.id) {
        setError(
          'Đây là deck của người khác. Vào trang xem trước để Clone về deck của bạn trước khi học.',
        )
        setPageState('error')
        return
      }

      setDeckName(deckOwnerData.name)
      setOwnerChecked(true)
    }

    void checkOwner()

    return () => {
      cancelled = true
    }
  }, [scopedDeckId])

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
    setSessionStartTime(Date.now())
    setCompletedCards([])
    setEnrolledCount(0)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Không có phiên đăng nhập.')
      setPageState('error')
      return
    }

    if (scopedDeckId) {
      const { data: deckOwnerData, error: deckOwnerError } = await supabase
        .from('decks')
        .select('owner_id')
        .eq('id', scopedDeckId)
        .single()

      if (deckOwnerError || !deckOwnerData) {
        setError('Không tìm thấy deck.')
        setPageState('error')
        return
      }

      if (deckOwnerData.owner_id !== user.id) {
        setError(
          'Đây là deck của người khác. Vào trang xem trước để Clone về deck của bạn trước khi học.',
        )
        setPageState('error')
        return
      }
    }

    const today = todayLocalIsoDate()

    if (scopedDeckId) {
      const enroll = await enrollActivePool(user.id, scopedDeckId, today)
      if (enroll.fatalError) {
        console.error(enroll.fatalError)
        setError(LOAD_ERROR_COPY)
        setPageState('error')
        return
      }
      setEnrolledCount(enroll.enrolledCount)
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
      console.error(progressResult.error)
      setError(LOAD_ERROR_COPY)
      setPageState('error')
      return
    }
    if (vocabResult.error) {
      console.error(vocabResult.error)
      setError(LOAD_ERROR_COPY)
      setPageState('error')
      return
    }

    const items = ((progressResult.data ?? []) as ProgressJoinRow[])
      .map(mapQueueRow)
      .filter((item): item is ReviewQueueItem => item !== null)
      .map((item) => ({ ...item, wrongCount: 0 }))

    if (items.length === 0) {
      setQueue([])
      setPageState('empty')
      return
    }

    const pool = ((vocabResult.data ?? []) as Pick<VocabItem, 'finnish_word'>[]).map(
      (row) => row.finnish_word,
    )
    const shuffled = shuffle(items)
    setFinnishPool(pool)
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

    if (updateError) {
      console.error(updateError)
      return 'Không lưu được câu trả lời. Thử lại.'
    }
    return null
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
      const finishedCard = queue[0]
      if (finishedCard) {
        setCompletedCards((prev) => [...prev, finishedCard])
      }

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

  async function submitMcqChoice(chosen: string) {
    const card = queue[0]
    if (!card || feedback || saving) return

    const correct = chosen === card.finnishWord
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (pageState !== 'reviewing') return

      if (feedback) {
        if (event.key === 'Enter') {
          event.preventDefault()
          handleNext()
        }
        return
      }

      if (askMode === 'mcq' && !saving) {
        const key = event.key.toUpperCase()
        const index = key.charCodeAt(0) - 65
        if (key.length === 1 && index >= 0 && index < mcqOptions.length) {
          event.preventDefault()
          const chosen = mcqOptions[index]
          setSelectedOption(chosen)
          void submitMcqChoice(chosen)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pageState, feedback, askMode, mcqOptions, saving, queue, handleNext, submitMcqChoice])

  useEffect(() => {
    if (pageState === 'reviewing' && askMode === 'type' && !feedback) {
      typedInputRef.current?.focus()
    }
  }, [pageState, askMode, feedback, queue])

  const card = queue[0]
  const startDisabled = enabledModes.length === 0 || (Boolean(scopedDeckId) && !ownerChecked)

  if (pageState === 'setup') {
    const scopeLine =
      reviewMode === 'deck'
        ? deckName
          ? `Deck: ${deckName}`
          : 'Đang kiểm tra deck…'
        : 'Tất cả từ đang đến hạn'

    return (
      <FocusLayout>
        <h1>Ôn tập hôm nay</h1>
        <div className={mutedTextClassName}>{scopeLine}</div>

        <fieldset className="mt-8 w-full border-0 p-0">
          <legend className={`mb-2 block text-xs ${mutedTextClassName}`}>Hình thức hỏi</legend>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={typeEnabled}
                onChange={(e) => setTypeEnabled(e.target.checked)}
                className={checkboxClassName}
              />
              <span>
                <span className="block text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                  Gõ chữ
                </span>
                <span className={`mt-0.5 block text-xs ${mutedTextClassName}`}>
                  Nhập từ tiếng Phần Lan theo nghĩa.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={mcqEnabled}
                onChange={(e) => setMcqEnabled(e.target.checked)}
                className={checkboxClassName}
              />
              <span>
                <span className="block text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                  Trắc nghiệm
                </span>
                <span className={`mt-0.5 block text-xs ${mutedTextClassName}`}>
                  Chọn một trong bốn đáp án.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className={`mt-3 text-sm ${mutedTextClassName}`}>
          Tick cả hai để mỗi từ random một hình thức.
        </div>

        <div className="mt-8">
          <Button
            type="button"
            variant="primary"
            disabled={startDisabled}
            onClick={() => void startReview()}
          >
            Bắt đầu ôn tập
          </Button>
          {enabledModes.length === 0 ? (
            <div className={`mt-2 text-sm ${mutedTextClassName}`} role="status">
              Chọn ít nhất một hình thức hỏi.
            </div>
          ) : null}
        </div>
      </FocusLayout>
    )
  }

  if (pageState === 'loading') {
    return (
      <FocusLayout>
        <div className={mutedTextClassName} role="status">
          Đang chuẩn bị phiên ôn tập…
        </div>
      </FocusLayout>
    )
  }

  if (pageState === 'error') {
    return (
      <FocusLayout>
        <div
          className="text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
          role="alert"
        >
          {error}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {scopedDeckId ? (
            <Link to={`/decks/${scopedDeckId}/preview`} className={backLinkClassName}>
              Xem trước deck
            </Link>
          ) : null}
          <Link to="/decks" className={backLinkClassName}>
            Decks
          </Link>
        </div>
      </FocusLayout>
    )
  }

  if (pageState === 'empty') {
    return (
      <FocusLayout>
        <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
          Không có từ nào cần ôn hôm nay.
        </div>
        <div className={`mt-2 text-sm ${mutedTextClassName}`}>
          {reviewMode === 'deck'
            ? 'Deck này chưa có từ nào đến hạn.'
            : 'Quay lại sau khi có từ đến hạn.'}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {scopedDeckId ? (
            <Link to={`/decks/${scopedDeckId}`} className={backLinkClassName}>
              Xem deck
            </Link>
          ) : null}
          <Link to="/decks" className={backLinkClassName}>
            Decks
          </Link>
        </div>
      </FocusLayout>
    )
  }

  if (pageState === 'done') {
    const total = completedCards.length
    const easyCount = completedCards.filter((c) => c.wrongCount === 0).length
    const okCount = completedCards.filter((c) => c.wrongCount === 1).length
    const forgotCount = completedCards.filter((c) => c.wrongCount >= 2).length
    const forgotCards = completedCards.filter((c) => c.wrongCount >= 2)

    const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0
    const elapsedMinutes = Math.floor(elapsedMs / 60000)
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)
    const elapsedLabel = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`

    const summaryStats: { label: string; value: number; tone: 'success' | 'danger' | 'plain' }[] =
      [
        { label: 'Nhớ dễ', value: easyCount, tone: easyCount > 0 ? 'success' : 'plain' },
        { label: 'Nhớ', value: okCount, tone: 'plain' },
        { label: 'Quên', value: forgotCount, tone: forgotCount > 0 ? 'danger' : 'plain' },
      ]

    return (
      <FocusLayout>
        <h1>Hoàn thành!</h1>
        <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
          Đã ôn xong {total} từ hôm nay trong {elapsedLabel}.
        </div>

        {scopedDeckId && enrolledCount > 0 ? (
          <div className={`mt-2 text-sm ${mutedTextClassName}`}>
            Có {enrolledCount} từ mới được thêm vào hôm nay.
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-3 gap-x-8 gap-y-6">
          {summaryStats.map((stat) => (
            <div key={stat.label}>
              <div className={`text-xs ${mutedTextClassName}`}>{stat.label}</div>
              <div
                className={
                  stat.tone === 'success'
                    ? 'mt-1 text-xl font-light text-[var(--color-success)] dark:text-[var(--color-success-dark)]'
                    : stat.tone === 'danger'
                      ? 'mt-1 text-xl font-light text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]'
                      : `mt-1 text-xl font-light text-[var(--color-text)] dark:text-[var(--color-text-dark)]`
                }
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {forgotCards.length > 0 ? (
          <div className="mt-10">
            <h2>Từ cần chú ý</h2>
            <VocabTable
              items={forgotCards.map((forgotCard) => ({
                id: forgotCard.progressId,
                finnish_word: forgotCard.finnishWord,
                translation: forgotCard.translation,
              }))}
              showStatus={false}
              caption="Danh sách từ cần chú ý trong phiên này"
            />
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className={buttonPrimaryClassName}>
            Về trang chủ
          </Link>
          <Link to="/decks" className={buttonSecondaryClassName}>
            Xem decks
          </Link>
        </div>
      </FocusLayout>
    )
  }

  if (!card) {
    return (
      <FocusLayout>
        <div className={mutedTextClassName} role="status">
          Đang chuẩn bị phiên ôn tập…
        </div>
      </FocusLayout>
    )
  }

  const canSubmit =
    !feedback &&
    !saving &&
    (askMode === 'type' ? typedAnswer.trim() !== '' : selectedOption !== null)

  const completedCount = completedCards.length
  const sessionTotal = completedCards.length + queue.length

  return (
    <FocusLayout>
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">Ôn tập hôm nay</h1>

        {sessionTotal > 0 ? (
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>
              {completedCount} / {sessionTotal} từ
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={sessionTotal}
              aria-valuenow={completedCount}
              aria-label="Tiến độ phiên ôn tập"
              className="mt-2 h-0.5 w-full overflow-hidden rounded-base bg-[var(--color-border)] dark:bg-[var(--color-border-dark)]"
            >
              <div
                className="h-full rounded-base bg-[var(--color-accent)] dark:bg-[var(--color-accent-dark)]"
                style={{ width: `${(completedCount / sessionTotal) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div>
          <div className={`text-xs ${mutedTextClassName}`}>Nghĩa</div>
          <div className="mt-1 break-words text-2xl font-medium leading-snug text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
            {card.translation}
          </div>
        </div>

        <form className="flex flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
          {askMode === 'type' ? (
            <Input
              ref={typedInputRef}
              label="Gõ từ tiếng Phần Lan"
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              disabled={Boolean(feedback) || saving}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="!text-base"
            />
          ) : (
            <fieldset
              disabled={Boolean(feedback) || saving}
              className="w-full border-0 p-0 disabled:opacity-60"
            >
              <legend className={`mb-2 block text-xs ${mutedTextClassName}`}>
                Chọn từ tiếng Phần Lan
              </legend>
              <div>
                {mcqOptions.map((option, index) => {
                  const selected = selectedOption === option
                  return (
                    <label
                      key={option}
                      className={
                        selected
                          ? `flex min-h-11 cursor-pointer items-center gap-3 border-b border-l-2 border-[var(--color-border)] border-l-[var(--color-accent)] py-2 pl-2.5 font-medium last:border-b-0 dark:border-[var(--color-border-dark)] dark:border-l-[var(--color-accent-dark)]`
                          : `flex min-h-11 cursor-pointer items-center gap-3 border-b border-l-2 border-[var(--color-border)] border-l-transparent py-2 pl-2.5 last:border-b-0 dark:border-[var(--color-border-dark)]`
                      }
                    >
                      <input
                        type="radio"
                        name="mcq"
                        value={option}
                        checked={selected}
                        onChange={() => setSelectedOption(option)}
                        className="shrink-0 accent-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] dark:accent-[var(--color-accent-dark)] dark:focus-visible:outline-[var(--color-accent-dark)]"
                      />
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-base border border-[var(--color-border)] text-xs ${mutedTextClassName} dark:border-[var(--color-border-dark)]`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="break-words text-base text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                        {option}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          {error && !feedback ? (
            <div
              className="text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {!feedback ? (
            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
                loading={saving}
                className="w-full sm:w-auto"
              >
                {saving ? 'Đang lưu…' : 'Trả lời'}
              </Button>
            </div>
          ) : (
            <div
              className="border-t border-[var(--color-border)] pt-6 dark:border-[var(--color-border-dark)]"
              role="status"
              aria-live="polite"
            >
              <div
                className={
                  feedback.correct
                    ? 'text-lg font-medium text-[var(--color-success)] dark:text-[var(--color-success-dark)]'
                    : 'text-lg font-medium text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]'
                }
              >
                {feedback.correct ? 'Đúng!' : 'Sai.'}
              </div>
              <div className="mt-2 text-base text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                <span className={mutedTextClassName}>Đáp án: </span>
                <strong>{card.finnishWord}</strong>
              </div>
              <div className="mt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  Tiếp theo
                </Button>
              </div>
            </div>
          )}

          <div className={`hidden text-xs sm:block ${mutedTextClassName}`} aria-hidden="true">
            {feedback
              ? 'Enter để tiếp tục'
              : askMode === 'type'
                ? 'Enter để trả lời'
                : 'Nhấn A–D để chọn đáp án'}
          </div>
        </form>
      </div>
    </FocusLayout>
  )
}
