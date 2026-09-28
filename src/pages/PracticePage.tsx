import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, buttonSecondaryClassName } from '../components/Button'
import { Input } from '../components/Input'
import { backLinkClassName } from '../components/linkClasses'
import {
  generateExercise,
  messageForGenerateError,
  type GenerateExerciseErr,
} from '../lib/generateExercise'
import { PRACTICE_SESSION_LIMIT } from '../lib/sessionLimits'
import { supabase } from '../lib/supabase'
import type {
  ExerciseContent,
  ExerciseType,
  FillBlankContent,
  McqContent,
  VocabItem,
} from '../types/database'

type PageState = 'setup' | 'loading' | 'practicing' | 'empty' | 'done' | 'error'

type ProgressJoinRow = {
  vocab_item_id: string
  interval_days: number
  vocab_items: VocabItem | VocabItem[] | null
}

type PracticeWord = {
  vocabItemId: string
  finnishWord: string
  translation: string
  exerciseType: ExerciseType
}

type LoadedExercise = {
  id: string
  exerciseType: ExerciseType
  content: ExerciseContent
}

type StruggledQuestion = {
  prompt: string
  expected: string
}

type StruggledWord = {
  vocabItemId: string
  finnishWord: string
  translation: string
  questions: StruggledQuestion[]
}

const mutedTextClassName =
  'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]'

const EMPTY_COPY =
  'Chưa có từ nào đủ điều kiện luyện tập Level 2, hãy tiếp tục ôn tập Level 1 trước.'

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase()
}

function pickExerciseType(): ExerciseType {
  return Math.random() < 0.5 ? 'fill_blank' : 'mcq'
}

function vocabFromJoin(row: ProgressJoinRow): VocabItem | null {
  const vocab = Array.isArray(row.vocab_items) ? row.vocab_items[0] : row.vocab_items
  return vocab ?? null
}

function expectedAnswer(exercise: LoadedExercise): string {
  if (exercise.exerciseType === 'fill_blank') {
    return (exercise.content as FillBlankContent).answer
  }
  return (exercise.content as McqContent).correct
}

/**
 * Eligible words (interval_days >= 3), ordered by ascending total times_shown
 * across all generated_exercises for that vocab_item (0 if none), then capped.
 */
async function loadPracticeWords(
  userId: string,
  deckId: string,
): Promise<{ words: PracticeWord[]; fatalError: string | null }> {
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .select('vocab_item_id, interval_days, vocab_items!inner(*)')
    .eq('user_id', userId)
    .eq('vocab_items.deck_id', deckId)
    .gte('interval_days', 3)

  if (error) {
    console.error(error)
    return { words: [], fatalError: 'Không tải được danh sách từ luyện tập. Thử lại sau.' }
  }

  const candidates: { vocabItemId: string; finnishWord: string; translation: string }[] = []
  for (const row of (data ?? []) as ProgressJoinRow[]) {
    const vocab = vocabFromJoin(row)
    if (!vocab) continue
    candidates.push({
      vocabItemId: row.vocab_item_id,
      finnishWord: vocab.finnish_word,
      translation: vocab.translation,
    })
  }

  if (candidates.length === 0) {
    return { words: [], fatalError: null }
  }

  const totals = new Map<string, number>()
  for (const c of candidates) {
    totals.set(c.vocabItemId, 0)
  }

  const ids = candidates.map((c) => c.vocabItemId)
  // Sum times_shown client-side (no deck_id on progress; exercises keyed by vocab_item_id).
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from('generated_exercises')
    .select('vocab_item_id, times_shown')
    .in('vocab_item_id', ids)

  if (exerciseError) {
    console.error(exerciseError)
    // Fall back to all-zero totals so practice still starts (order unstable but usable).
  } else {
    for (const row of (exerciseRows ?? []) as { vocab_item_id: string; times_shown: number }[]) {
      totals.set(row.vocab_item_id, (totals.get(row.vocab_item_id) ?? 0) + row.times_shown)
    }
  }

  candidates.sort((a, b) => {
    const diff = (totals.get(a.vocabItemId) ?? 0) - (totals.get(b.vocabItemId) ?? 0)
    if (diff !== 0) return diff
    return a.vocabItemId.localeCompare(b.vocabItemId)
  })

  const selected = candidates.slice(0, PRACTICE_SESSION_LIMIT)
  const words: PracticeWord[] = selected.map((c) => ({
    ...c,
    exerciseType: pickExerciseType(),
  }))

  return { words, fatalError: null }
}

export function PracticePage() {
  const { deckId: deckIdParam } = useParams<{ deckId?: string }>()
  const deckId = deckIdParam?.trim() || null

  const [pageState, setPageState] = useState<PageState>('setup')
  const [error, setError] = useState<string | null>(null)
  const [deckName, setDeckName] = useState<string | null>(null)
  const [ownerChecked, setOwnerChecked] = useState(false)

  const [queue, setQueue] = useState<PracticeWord[]>([])
  const [wordIndex, setWordIndex] = useState(0)
  const [attemptIndex, setAttemptIndex] = useState(0)
  const [exercise, setExercise] = useState<LoadedExercise | null>(null)
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [exerciseError, setExerciseError] = useState<string | null>(null)

  const [typedAnswer, setTypedAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string } | null>(null)

  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [totalAnswers, setTotalAnswers] = useState(0)
  const [sessionWordCount, setSessionWordCount] = useState(0)
  const [struggledWords, setStruggledWords] = useState<StruggledWord[]>([])

  const typedInputRef = useRef<HTMLInputElement | null>(null)
  const firstWrongQuestionRef = useRef<StruggledQuestion | null>(null)

  useEffect(() => {
    if (!deckId) {
      setError('Không tìm thấy deck.')
      setPageState('error')
      return
    }

    setDeckName(null)
    setOwnerChecked(false)
    setPageState('setup')
    setError(null)

    let cancelled = false

    async function checkOwner() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: deckOwnerData, error: deckOwnerError } = await supabase
        .from('decks')
        .select('owner_id, name')
        .eq('id', deckId)
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
  }, [deckId])

  async function fetchExerciseForCurrent(
    word: PracticeWord,
  ): Promise<{ ok: true } | { ok: false; err: GenerateExerciseErr }> {
    setLoadingExercise(true)
    setExerciseError(null)
    setExercise(null)
    setFeedback(null)
    setTypedAnswer('')
    setSelectedOption(null)

    const result = await generateExercise(word.vocabItemId, word.exerciseType)
    setLoadingExercise(false)

    if (!result.ok) {
      setExerciseError(messageForGenerateError(result))
      return { ok: false, err: result }
    }

    setExercise({
      id: result.exercise.id,
      exerciseType: result.exercise.exercise_type,
      content: result.exercise.content,
    })
    return { ok: true }
  }

  async function startPractice() {
    if (!deckId || !ownerChecked) return

    setPageState('loading')
    setError(null)
    setCorrectAnswers(0)
    setTotalAnswers(0)
    setStruggledWords([])
    firstWrongQuestionRef.current = null
    setWordIndex(0)
    setAttemptIndex(0)
    setExercise(null)
    setFeedback(null)
    setExerciseError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Không có phiên đăng nhập.')
      setPageState('error')
      return
    }

    const { data: deckOwnerData, error: deckOwnerError } = await supabase
      .from('decks')
      .select('owner_id')
      .eq('id', deckId)
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

    const { words, fatalError } = await loadPracticeWords(user.id, deckId)
    if (fatalError) {
      setError(fatalError)
      setPageState('error')
      return
    }
    if (words.length === 0) {
      setQueue([])
      setSessionWordCount(0)
      setPageState('empty')
      return
    }

    setQueue(words)
    setSessionWordCount(words.length)
    setPageState('practicing')
    await fetchExerciseForCurrent(words[0])
  }

  function finishSession() {
    setPageState('done')
    setExercise(null)
    setFeedback(null)
    setExerciseError(null)
  }

  async function advanceToNextWord() {
    const nextIndex = wordIndex + 1
    if (nextIndex >= queue.length) {
      finishSession()
      return
    }
    setWordIndex(nextIndex)
    setAttemptIndex(0)
    await fetchExerciseForCurrent(queue[nextIndex])
  }

  async function handleNextAfterFeedback() {
    if (!feedback) return
    const word = queue[wordIndex]
    if (!word) return

    if (feedback.correct) {
      firstWrongQuestionRef.current = null
      await advanceToNextWord()
      return
    }

    // Wrong: one retry max (attemptIndex 0 → fetch again; attemptIndex 1 → next word)
    if (attemptIndex === 0) {
      // Keep attempt-1 question before retry fetch clears exercise (for struggled table)
      if (exercise) {
        firstWrongQuestionRef.current = {
          prompt: exercise.content.prompt,
          expected: expectedAnswer(exercise),
        }
      }
      setAttemptIndex(1)
      await fetchExerciseForCurrent(word)
      return
    }

    // Wrong both attempts: collect for end-of-session notice (attempt 1 from ref + attempt 2)
    const questions: StruggledQuestion[] = []
    if (firstWrongQuestionRef.current) {
      questions.push(firstWrongQuestionRef.current)
    }
    if (exercise) {
      questions.push({
        prompt: exercise.content.prompt,
        expected: expectedAnswer(exercise),
      })
    }
    if (questions.length > 0) {
      setStruggledWords((prev) => [
        ...prev,
        {
          vocabItemId: word.vocabItemId,
          finnishWord: word.finnishWord,
          translation: word.translation,
          questions,
        },
      ])
    }
    firstWrongQuestionRef.current = null
    await advanceToNextWord()
  }

  async function skipCurrentWord() {
    await advanceToNextWord()
  }

  async function retryLoadExercise() {
    const word = queue[wordIndex]
    if (!word) return
    await fetchExerciseForCurrent(word)
  }

  function checkAnswer(loaded: LoadedExercise): boolean {
    if (loaded.exerciseType === 'fill_blank') {
      const content = loaded.content as FillBlankContent
      return normalizeAnswer(typedAnswer) === normalizeAnswer(content.answer)
    }
    const content = loaded.content as McqContent
    return selectedOption !== null && selectedOption === content.correct
  }

  function recordAnswer(correct: boolean, expected: string) {
    setTotalAnswers((n) => n + 1)
    if (correct) setCorrectAnswers((n) => n + 1)
    setFeedback({ correct, expected })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const loaded = exercise
    if (!loaded || feedback || loadingExercise) return
    if (loaded.exerciseType === 'fill_blank' && typedAnswer.trim() === '') return
    if (loaded.exerciseType === 'mcq' && selectedOption === null) return

    const correct = checkAnswer(loaded)
    recordAnswer(correct, expectedAnswer(loaded))
  }

  function submitMcqChoice(chosen: string) {
    const loaded = exercise
    if (!loaded || feedback || loadingExercise || loaded.exerciseType !== 'mcq') return
    setSelectedOption(chosen)
    const content = loaded.content as McqContent
    const correct = chosen === content.correct
    recordAnswer(correct, content.correct)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (pageState !== 'practicing') return

      if (feedback) {
        if (event.key === 'Enter') {
          event.preventDefault()
          void handleNextAfterFeedback()
        }
        return
      }

      if (exerciseError || loadingExercise || !exercise) return

      if (exercise.exerciseType === 'mcq') {
        const options = (exercise.content as McqContent).options
        const key = event.key.toUpperCase()
        const index = key.charCodeAt(0) - 65
        if (key.length === 1 && index >= 0 && index < options.length) {
          event.preventDefault()
          submitMcqChoice(options[index])
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [
    pageState,
    feedback,
    exerciseError,
    loadingExercise,
    exercise,
    wordIndex,
    attemptIndex,
    queue,
  ])

  useEffect(() => {
    if (
      pageState === 'practicing' &&
      exercise?.exerciseType === 'fill_blank' &&
      !feedback &&
      !loadingExercise
    ) {
      typedInputRef.current?.focus()
    }
  }, [pageState, exercise, feedback, loadingExercise, wordIndex, attemptIndex])

  const currentWord = queue[wordIndex] ?? null

  if (pageState === 'setup') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <h1>Luyện tập Level 2</h1>
        <div className={`mt-2 ${mutedTextClassName}`}>
          {deckName ? `Deck: ${deckName}` : 'Đang kiểm tra deck…'}
        </div>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          Luyện fill-in-the-blank và trắc nghiệm cho các từ đã ôn đủ lâu (interval ≥ 3 ngày). Tối đa{' '}
          {PRACTICE_SESSION_LIMIT} từ mỗi phiên. Không đổi lịch SRS.
        </p>
        <div className="mt-8">
          <Button
            type="button"
            variant="primary"
            disabled={!ownerChecked || !deckId}
            onClick={() => void startPractice()}
          >
            Bắt đầu luyện tập
          </Button>
          {error ? (
            <div
              className="mt-2 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className={mutedTextClassName} role="status">
          Đang chuẩn bị phiên luyện tập…
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div
          className="text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
          role="alert"
        >
          {error}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {deckId ? (
            <Link to={`/decks/${deckId}/preview`} className={backLinkClassName}>
              Xem trước deck
            </Link>
          ) : null}
          <Link to="/decks" className={backLinkClassName}>
            Decks
          </Link>
        </div>
      </div>
    )
  }

  if (pageState === 'empty') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
          {EMPTY_COPY}
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {deckId ? (
            <Link to={`/decks/${deckId}`} className={backLinkClassName}>
              Xem deck
            </Link>
          ) : null}
          {deckId ? (
            <Link to={`/review/${deckId}`} className={backLinkClassName}>
              Ôn tập Level 1
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  if (pageState === 'done') {
    return (
      <div className="mx-auto w-full max-w-xl">
        <h1>Hoàn thành!</h1>
        <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
          Đúng {correctAnswers} / {totalAnswers} câu trong phiên này.
        </div>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          Tổng số câu gồm cả lần làm lại khi sai. Lịch ôn Level 1 không đổi.
        </p>
        {struggledWords.length > 0 ? (
          <div className="mt-8 border-t border-[var(--color-border)] pt-6 dark:border-[var(--color-border-dark)]">
            <h2 className="text-lg font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              Chú ý những từ này vì bạn sai 2 lần
            </h2>
            <ul className="mt-4 space-y-6">
              {struggledWords.map((w) => (
                <li key={w.vocabItemId}>
                  <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                    {w.finnishWord} — {w.translation}
                  </div>
                  <ul className={`mt-2 space-y-2 text-sm ${mutedTextClassName}`}>
                    {w.questions.map((q, i) => (
                      <li key={i}>
                        <div>{q.prompt}</div>
                        <div>
                          Đáp án: <strong>{q.expected}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-10 flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={() => void startPractice()}>
            Luyện lại
          </Button>
          {deckId ? (
            <Link to={`/decks/${deckId}`} className={buttonSecondaryClassName}>
              Về deck
            </Link>
          ) : null}
          <Link to="/" className={buttonSecondaryClassName}>
            Về trang chủ
          </Link>
        </div>
      </div>
    )
  }

  // practicing
  const progressLabel =
    sessionWordCount > 0 ? `${Math.min(wordIndex + 1, sessionWordCount)} / ${sessionWordCount} từ` : null

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">Luyện tập Level 2</h1>

        {progressLabel ? (
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>{progressLabel}</div>
            {attemptIndex === 1 ? (
              <div className={`mt-1 text-xs ${mutedTextClassName}`}>Lần làm lại</div>
            ) : null}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={sessionWordCount}
              aria-valuenow={wordIndex}
              aria-label="Tiến độ phiên luyện tập"
              className="mt-2 h-0.5 w-full overflow-hidden rounded-base bg-[var(--color-border)] dark:bg-[var(--color-border-dark)]"
            >
              <div
                className="h-full rounded-base bg-[var(--color-accent)] dark:bg-[var(--color-accent-dark)]"
                style={{
                  width: `${sessionWordCount > 0 ? (wordIndex / sessionWordCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {currentWord ? (
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>Từ</div>
            <div className="mt-1 break-words text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              {currentWord.finnishWord}
              <span className={`ml-2 ${mutedTextClassName}`}>({currentWord.translation})</span>
            </div>
          </div>
        ) : null}

        {loadingExercise ? (
          <div className={mutedTextClassName} role="status">
            Đang tải bài tập…
          </div>
        ) : null}

        {exerciseError && !loadingExercise ? (
          <div>
            <div
              className="text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
              role="alert"
            >
              {exerciseError}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="primary" onClick={() => void retryLoadExercise()}>
                Thử lại
              </Button>
              <Button type="button" variant="secondary" onClick={() => void skipCurrentWord()}>
                Bỏ qua từ này
              </Button>
            </div>
          </div>
        ) : null}

        {exercise && !loadingExercise && !exerciseError ? (
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div>
              <div className={`text-xs ${mutedTextClassName}`}>
                {exercise.exerciseType === 'fill_blank' ? 'Điền chỗ trống' : 'Trắc nghiệm'}
              </div>
              <div className="mt-1 break-words text-xl font-medium leading-snug text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                {exercise.content.prompt}
              </div>
            </div>

            {exercise.exerciseType === 'fill_blank' ? (
              <Input
                ref={typedInputRef}
                label="Đáp án"
                type="text"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                disabled={Boolean(feedback)}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="!text-base"
              />
            ) : (
              <fieldset disabled={Boolean(feedback)} className="w-full border-0 p-0 disabled:opacity-60">
                <legend className={`mb-2 block text-xs ${mutedTextClassName}`}>Chọn đáp án</legend>
                <div>
                  {(exercise.content as McqContent).options.map((option, index) => {
                    const selected = selectedOption === option
                    return (
                      <label
                        key={`${exercise.id}-${option}-${index}`}
                        className={
                          selected
                            ? `flex min-h-11 cursor-pointer items-center gap-3 border-b border-l-2 border-[var(--color-border)] border-l-[var(--color-accent)] py-2 pl-2.5 font-medium last:border-b-0 dark:border-[var(--color-border-dark)] dark:border-l-[var(--color-accent-dark)]`
                            : `flex min-h-11 cursor-pointer items-center gap-3 border-b border-l-2 border-[var(--color-border)] border-l-transparent py-2 pl-2.5 last:border-b-0 dark:border-[var(--color-border-dark)]`
                        }
                      >
                        <input
                          type="radio"
                          name="practice-mcq"
                          value={option}
                          checked={selected}
                          onChange={() => submitMcqChoice(option)}
                          className="shrink-0 accent-[var(--color-accent)]"
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

            {!feedback ? (
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    exercise.exerciseType === 'fill_blank'
                      ? typedAnswer.trim() === ''
                      : selectedOption === null
                  }
                  className="w-full sm:w-auto"
                >
                  Trả lời
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
                {!feedback.correct && attemptIndex === 1 ? (
                  <div className="mt-2 text-base text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                    <span className={mutedTextClassName}>Đáp án: </span>
                    <strong>{feedback.expected}</strong>
                  </div>
                ) : null}
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void handleNextAfterFeedback()}
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
                : exercise.exerciseType === 'fill_blank'
                  ? 'Enter để trả lời'
                  : 'Nhấn A–D để chọn đáp án'}
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
