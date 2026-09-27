import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonSecondaryClassName } from '../components/Button'
import { FileField } from '../components/FileField'
import { FocusLayout } from '../components/FocusLayout'
import { Input } from '../components/Input'
import { parseDeckFile, type ValidLine } from '../lib/deckParser'
import {
  advanceSession,
  applyWrong,
  type SessionCard,
} from '../lib/session'

type PageState = 'upload' | 'setup' | 'reviewing' | 'done'
type AskMode = 'type' | 'mcq'

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

function lineToSessionCard(line: ValidLine, index: number): SessionCard {
  return {
    progressId: String(line.lineNumber),
    vocabItemId: `file-${index}`,
    finnishWord: line.finnishWord,
    translation: line.translation,
    easeFactor: 0,
    intervalDays: 0,
    reviewCount: 0,
    wrongCount: 0,
    totalWrong: 0,
    repeatDebt: 0,
    persisted: false,
  }
}

export function FilePracticePage() {
  const [pageState, setPageState] = useState<PageState>('upload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseErrorCount, setParseErrorCount] = useState(0)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [validLines, setValidLines] = useState<ValidLine[]>([])

  const [typeEnabled, setTypeEnabled] = useState(true)
  const [mcqEnabled, setMcqEnabled] = useState(true)
  const [chosenCount, setChosenCount] = useState(0)

  const [queue, setQueue] = useState<SessionCard[]>([])
  const [askMode, setAskMode] = useState<AskMode>('type')
  const [mcqOptions, setMcqOptions] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null)
  const [finnishPool, setFinnishPool] = useState<string[]>([])
  const [completedCards, setCompletedCards] = useState<SessionCard[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [initialSessionSize, setInitialSessionSize] = useState(0)
  const [correctAttempts, setCorrectAttempts] = useState(0)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [plannedAttempts, setPlannedAttempts] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)

  const typedInputRef = useRef<HTMLInputElement | null>(null)

  const enabledModes: AskMode[] = [
    ...(typeEnabled ? (['type'] as const) : []),
    ...(mcqEnabled ? (['mcq'] as const) : []),
  ]

  function presentCard(nextQueue: SessionCard[], modes: AskMode[], pool: string[]) {
    const card = nextQueue[0]
    if (!card) return
    setQuestionNumber((n) => n + 1)
    let mode = pickMode(modes)
    let options: string[] = []
    if (mode === 'mcq') {
      const mcq = pickMcqOptions(card.finnishWord, pool)
      if (mcq) {
        options = mcq
      } else {
        mode = 'type'
      }
    }
    setAskMode(mode)
    setMcqOptions(options)
    setTypedAnswer('')
    setSelectedOption(null)
    setFeedback(null)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setUploadMessage(null)
    setParseErrorCount(0)
    setFileName(null)

    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      const result = parseDeckFile(content)
      setFileName(file.name)

      if (result.errors.length > 0) {
        setParseErrorCount(result.errors.length)
        setValidLines([])
        setUploadMessage(null)
        return
      }

      if (result.validLines.length === 0) {
        setParseErrorCount(0)
        setValidLines([])
        setUploadMessage('File không có từ nào hợp lệ.')
        return
      }

      setParseErrorCount(0)
      setUploadMessage(null)
      setValidLines(result.validLines)
      setChosenCount(result.validLines.length)
      setPageState('setup')
    }
    reader.onerror = () => {
      setUploadMessage('Không đọc được file.')
      setParseErrorCount(0)
      setValidLines([])
    }
    reader.readAsText(file)
  }

  function startFilePractice() {
    if (enabledModes.length === 0 || validLines.length === 0) return

    const max = validLines.length
    const count = Math.min(max, Math.max(1, Math.floor(chosenCount) || 1))
    setChosenCount(count)

    const cards = shuffle(validLines.map(lineToSessionCard)).slice(0, count)
    const pool = cards.map((c) => c.finnishWord)

    setCompletedCards([])
    setSessionStartTime(Date.now())
    setInitialSessionSize(cards.length)
    setCorrectAttempts(0)
    setWrongAttempts(0)
    setElapsedSec(0)
    setQuestionNumber(0)
    setPlannedAttempts(cards.length)
    setFinnishPool(pool)
    setQueue(cards)
    presentCard(cards, enabledModes, pool)
    setPageState('reviewing')
  }

  function checkAnswer(card: SessionCard): boolean {
    if (askMode === 'type') {
      return normalizeAnswer(typedAnswer) === normalizeAnswer(card.finnishWord)
    }
    return selectedOption !== null && selectedOption === card.finnishWord
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const card = queue[0]
    if (!card || feedback) return
    if (askMode === 'mcq' && selectedOption === null) return
    if (askMode === 'type' && typedAnswer.trim() === '') return

    const correct = checkAnswer(card)
    if (!correct) {
      const nextTotalWrong = card.totalWrong + 1
      const debtAdd = nextTotalWrong === 1 ? 3 : nextTotalWrong === 2 ? 2 : 1
      setPlannedAttempts((p) => p + debtAdd)
      setWrongAttempts((n) => n + 1)
      setQueue((prev) => {
        const current = prev[0]
        if (!current) return prev
        return [applyWrong(current), ...prev.slice(1)]
      })
      setFeedback({ correct: false })
      return
    }

    setCorrectAttempts((n) => n + 1)
    setFeedback({ correct: true })
  }

  function submitMcqChoice(chosen: string) {
    const card = queue[0]
    if (!card || feedback) return

    const correct = chosen === card.finnishWord
    if (!correct) {
      const nextTotalWrong = card.totalWrong + 1
      const debtAdd = nextTotalWrong === 1 ? 3 : nextTotalWrong === 2 ? 2 : 1
      setPlannedAttempts((p) => p + debtAdd)
      setWrongAttempts((n) => n + 1)
      setQueue((prev) => {
        const current = prev[0]
        if (!current) return prev
        return [applyWrong(current), ...prev.slice(1)]
      })
      setFeedback({ correct: false })
      return
    }

    setCorrectAttempts((n) => n + 1)
    setFeedback({ correct: true })
  }

  function handleNext() {
    if (!feedback) return

    const current = queue[0]
    if (!current) return

    const result = advanceSession(queue, completedCards, feedback.correct, initialSessionSize)
    setQueue(result.queue)
    setCompletedCards(result.completedCards)
    if (result.done) {
      setPageState('done')
      return
    }
    presentCard(result.queue, enabledModes, finnishPool)
  }

  function resetToUpload() {
    setPageState('upload')
    setValidLines([])
    setQueue([])
    setCompletedCards([])
    setSessionStartTime(null)
    setInitialSessionSize(0)
    setFinnishPool([])
    setFileName(null)
    setParseErrorCount(0)
    setUploadMessage(null)
    setChosenCount(0)
    setFeedback(null)
    setTypedAnswer('')
    setSelectedOption(null)
    setCorrectAttempts(0)
    setWrongAttempts(0)
    setPlannedAttempts(0)
    setElapsedSec(0)
    setQuestionNumber(0)
  }

  function backToSetup() {
    setQueue([])
    setCompletedCards([])
    setSessionStartTime(null)
    setFeedback(null)
    setTypedAnswer('')
    setSelectedOption(null)
    setPageState('setup')
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

      if (askMode === 'mcq') {
        const key = event.key.toUpperCase()
        const index = key.charCodeAt(0) - 65
        if (key.length === 1 && index >= 0 && index < mcqOptions.length) {
          event.preventDefault()
          const chosen = mcqOptions[index]
          setSelectedOption(chosen)
          submitMcqChoice(chosen)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pageState, feedback, askMode, mcqOptions, queue, completedCards, initialSessionSize, finnishPool, enabledModes])

  useEffect(() => {
    if (pageState !== 'reviewing') return
    const id = setInterval(() => {
      if (sessionStartTime !== null) {
        setElapsedSec(Math.floor((Date.now() - sessionStartTime) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [pageState, sessionStartTime])

  useEffect(() => {
    if (pageState === 'reviewing' && askMode === 'type' && !feedback) {
      typedInputRef.current?.focus()
    }
  }, [pageState, askMode, feedback, queue])

  if (pageState === 'upload') {
    return (
      <FocusLayout>
        <h1>Luyện file tự do</h1>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          Upload file từ vựng để luyện nhanh trong phiên này. Không lưu vào deck hay lịch ôn.
        </p>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          Mỗi dòng: từ tiếng Phần Lan;nghĩa. Tối đa 500 dòng.
        </p>
        <div className="mt-8 max-w-lg">
          <FileField
            label="File từ vựng (.txt, .csv)"
            accept=".txt,.csv,text/plain,text/csv"
            fileName={fileName}
            onFileChange={handleFileChange}
            hint="Cùng định dạng với file tạo deck."
          />
        </div>
        {parseErrorCount > 0 ? (
          <p
            role="alert"
            className="mt-4 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
          >
            File có {parseErrorCount} dòng lỗi. Sửa file rồi thử lại.
            {fileName ? ` (${fileName})` : ''}
          </p>
        ) : null}
        {uploadMessage ? (
          <p
            role="alert"
            className="mt-4 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
          >
            {uploadMessage}
          </p>
        ) : null}
        <div className="mt-10">
          <Link to="/decks" className={buttonSecondaryClassName}>
            Về Decks
          </Link>
        </div>
      </FocusLayout>
    )
  }

  if (pageState === 'setup') {
    const startDisabled = enabledModes.length === 0
    return (
      <FocusLayout>
        <h1>Luyện file tự do</h1>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          {fileName ? `File: ${fileName}` : 'File đã tải'} — {validLines.length} từ hợp lệ. Không
          ghi database.
        </p>

        <div className="mt-8 max-w-xs">
          <Input
            label="Số từ luyện"
            type="number"
            min={1}
            max={validLines.length}
            step={1}
            inputMode="numeric"
            value={String(chosenCount)}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isFinite(n)) {
                setChosenCount(1)
                return
              }
              setChosenCount(n)
            }}
            onBlur={() => {
              const max = validLines.length
              setChosenCount((n) => Math.min(max, Math.max(1, Math.floor(n) || 1)))
            }}
          />
        </div>

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

        <p className={`mt-3 text-sm ${mutedTextClassName}`}>
          Chọn cả hai để mỗi từ được hỏi ngẫu nhiên theo một hình thức.
        </p>
        <p className={`mt-2 hidden text-sm sm:block ${mutedTextClassName}`} aria-hidden="true">
          Gõ chữ: Enter để trả lời. Trắc nghiệm: nhấn A, B, C hoặc D.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={startDisabled}
            onClick={() => startFilePractice()}
          >
            Bắt đầu luyện tập
          </Button>
          <Button type="button" variant="secondary" onClick={resetToUpload}>
            Đổi file
          </Button>
        </div>
        {startDisabled ? (
          <div className={`mt-2 text-sm ${mutedTextClassName}`} role="status">
            Chọn ít nhất một hình thức hỏi.
          </div>
        ) : null}
      </FocusLayout>
    )
  }

  if (pageState === 'done') {
    const wrongCards = completedCards.filter((c) => c.totalWrong > 0)
    const firstTryOk = completedCards.filter((c) => c.totalWrong === 0).length
    const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0
    const elapsedMinutes = Math.floor(elapsedMs / 60000)
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)
    const elapsedLabel = `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`

    return (
      <FocusLayout>
        <h1>Hoàn thành!</h1>
        <div className="font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
          Đã luyện {initialSessionSize} từ trong {elapsedLabel}.
        </div>
        <p className={`mt-2 text-sm ${mutedTextClassName}`}>
          Phiên này chỉ trong bộ nhớ. Không ghi deck hay lịch SRS.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>Đúng lần đầu</div>
            <div
              className={
                firstTryOk > 0
                  ? 'mt-1 text-xl font-light text-[var(--color-success)] dark:text-[var(--color-success-dark)]'
                  : 'mt-1 text-xl font-light text-[var(--color-text)] dark:text-[var(--color-text-dark)]'
              }
            >
              {firstTryOk}
            </div>
          </div>
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>Từng sai</div>
            <div
              className={
                wrongCards.length > 0
                  ? 'mt-1 text-xl font-light text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]'
                  : 'mt-1 text-xl font-light text-[var(--color-text)] dark:text-[var(--color-text-dark)]'
              }
            >
              {wrongCards.length}
            </div>
          </div>
        </div>

        {wrongCards.length > 0 ? (
          <div className="mt-10">
            <h2 className="text-lg font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              Từ đã sai
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              {wrongCards.map((c) => (
                <li key={c.vocabItemId}>
                  <span className="font-medium">{c.finnishWord}</span>
                  <span className={mutedTextClassName}> — {c.translation}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={`mt-8 text-sm ${mutedTextClassName}`}>Không sai từ nào.</p>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={backToSetup}>
            Luyện lại file này
          </Button>
          <Button type="button" variant="secondary" onClick={resetToUpload}>
            Luyện file khác
          </Button>
          <Link to="/decks" className={buttonSecondaryClassName}>
            Về Decks
          </Link>
        </div>
      </FocusLayout>
    )
  }

  // reviewing
  const card = queue[0]
  if (!card) {
    return (
      <FocusLayout>
        <div className={mutedTextClassName} role="status">
          Đang chuẩn bị…
        </div>
      </FocusLayout>
    )
  }

  const canSubmit =
    !feedback && (askMode === 'type' ? typedAnswer.trim() !== '' : selectedOption !== null)
  const completedCount = completedCards.length
  const hudMinutes = Math.floor(elapsedSec / 60)
  const hudSeconds = String(elapsedSec % 60).padStart(2, '0')
  const hudTime = `${hudMinutes}:${hudSeconds}`

  return (
    <FocusLayout>
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">Luyện file tự do</h1>

        {initialSessionSize > 0 ? (
          <div>
            <div className={`text-xs ${mutedTextClassName}`}>
              {completedCount} / {initialSessionSize} từ
            </div>
            <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${mutedTextClassName}`}>
              <span>
                Câu {questionNumber} / {plannedAttempts}
              </span>
              <span>Đúng {correctAttempts}</span>
              <span>Sai {wrongAttempts}</span>
              <span>{hudTime}</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={initialSessionSize}
              aria-valuenow={completedCount}
              aria-label="Tiến độ phiên luyện file"
              className="mt-2 h-0.5 w-full overflow-hidden rounded-base bg-[var(--color-border)] dark:bg-[var(--color-border-dark)]"
            >
              <div
                className="h-full rounded-base bg-[var(--color-accent)] dark:bg-[var(--color-accent-dark)]"
                style={{
                  width: `${initialSessionSize > 0 ? (completedCount / initialSessionSize) * 100 : 0}%`,
                }}
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

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {askMode === 'type' ? (
            <Input
              ref={typedInputRef}
              label="Gõ từ tiếng Phần Lan"
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
                        name="file-mcq"
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

          {!feedback ? (
            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit}
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
              <div className="mt-2 text-base text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                <span className={mutedTextClassName}>Đáp án: </span>
                <strong>{card.finnishWord}</strong>
              </div>
              <div className="mt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
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
