import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonPrimaryClassName } from '../components/Button'
import { supabase } from '../lib/supabase'
import { todayLocalIsoDate } from '../lib/srs'

const LOW_WORK_THRESHOLD = 10
const PROGRESS_PAGE_SIZE = 1000

type OwnedDeckRow = {
  id: string
  name: string
  created_at: string
  vocab_items: { count: number }[] | null
}

type ProgressRow = {
  interval_days: number
  due_date: string
}

type ProgressJoinRow = {
  id: string
  vocab_item_id: string
  vocab_items: { deck_id: string } | { deck_id: string }[] | null
}

type AccountSummary = {
  totalDecks: number
  totalWords: number
  enrolledCount: number
  notEnrolledCount: number
  graduatedCount: number
  activeCount: number
  dueTodayCount: number
}

type HomeTask = {
  deckId: string
  name: string
  createdAt: string
  dueCount: number
  done: boolean
}

type HomeSuggestion = {
  to: string
  title: string
}

function vocabCount(deck: OwnedDeckRow): number {
  return deck.vocab_items?.[0]?.count ?? 0
}

function localMidnightIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString()
}

function deckIdFromJoin(row: ProgressJoinRow): string | null {
  const vocab = Array.isArray(row.vocab_items) ? row.vocab_items[0] : row.vocab_items
  return vocab?.deck_id ?? null
}

async function fetchAllProgressPages(options: {
  userId: string
  dueDateLte?: string
  lastReviewedAtGte?: string
}): Promise<{ data: ProgressJoinRow[]; error: { message: string } | null }> {
  const all: ProgressJoinRow[] = []
  let from = 0

  for (;;) {
    let query = supabase
      .from('user_vocab_progress')
      .select('id, vocab_item_id, vocab_items!inner(deck_id)')
      .eq('user_id', options.userId)

    if (options.dueDateLte !== undefined) {
      query = query.lte('due_date', options.dueDateLte)
    }
    if (options.lastReviewedAtGte !== undefined) {
      query = query.gte('last_reviewed_at', options.lastReviewedAtGte)
    }

    const { data, error } = await query.order('id').range(from, from + 999)

    if (error) {
      return { data: all, error }
    }

    const page = (data ?? []) as ProgressJoinRow[]
    all.push(...page)
    if (page.length < PROGRESS_PAGE_SIZE) {
      return { data: all, error: null }
    }
    from += PROGRESS_PAGE_SIZE
  }
}

function countByOwnedDeck(rows: ProgressJoinRow[], ownedIds: Set<string>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const deckId = deckIdFromJoin(row)
    if (!deckId || !ownedIds.has(deckId)) continue
    counts.set(deckId, (counts.get(deckId) ?? 0) + 1)
  }
  return counts
}

function buildTasks(
  ownedDecks: OwnedDeckRow[],
  dueByDeck: Map<string, number>,
  reviewedByDeck: Map<string, number>,
): HomeTask[] {
  const tasks: HomeTask[] = []
  for (const deck of ownedDecks) {
    const dueCount = dueByDeck.get(deck.id) ?? 0
    const reviewedToday = (reviewedByDeck.get(deck.id) ?? 0) > 0
    if (dueCount > 0) {
      tasks.push({
        deckId: deck.id,
        name: deck.name,
        createdAt: deck.created_at,
        dueCount,
        done: false,
      })
    } else if (reviewedToday) {
      tasks.push({
        deckId: deck.id,
        name: deck.name,
        createdAt: deck.created_at,
        dueCount: 0,
        done: true,
      })
    }
  }

  const unchecked = tasks
    .filter((task) => !task.done)
    .sort((a, b) => {
      if (b.dueCount !== a.dueCount) return b.dueCount - a.dueCount
      return a.createdAt.localeCompare(b.createdAt)
    })
  const done = tasks.filter((task) => task.done)
  return [...unchecked, ...done]
}

function CheckIndicator({ done }: { done: boolean }) {
  return (
    <span
      role="img"
      aria-label={done ? 'Đã xong' : 'Chưa xong'}
      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center"
    >
      {done ? (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="9"
            className="fill-[var(--color-success)] dark:fill-[var(--color-success-dark)]"
          />
          <path
            d="M6.2 10.2 8.8 12.8 13.8 7.4"
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[var(--color-bg)] dark:stroke-[var(--color-bg-dark)]"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            strokeWidth="1.5"
            className="stroke-[var(--color-text-muted)] dark:stroke-[var(--color-text-muted-dark)]"
          />
        </svg>
      )}
    </span>
  )
}

function TaskRow({ task }: { task: HomeTask }) {
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0 dark:border-[var(--color-border-dark)]">
      <Link
        to={`/decks/${task.deckId}`}
        className="flex items-start gap-3 py-4 no-underline hover:bg-[var(--color-surface)] dark:hover:bg-[var(--color-surface-dark)]"
      >
        <CheckIndicator done={task.done} />
        <span className="min-w-0 flex-1">
          <span
            className={
              task.done
                ? 'block break-words font-medium text-[var(--color-text-muted)] line-through dark:text-[var(--color-text-muted-dark)]'
                : 'block break-words font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]'
            }
          >
            {task.name}
          </span>
          <span className="mt-0.5 block text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
            {task.done ? 'Xong hôm nay' : `${task.dueCount} từ đến hạn`}
          </span>
        </span>
      </Link>
    </li>
  )
}

function SuggestionRow({ suggestion }: { suggestion: HomeSuggestion }) {
  return (
    <Link
      to={suggestion.to}
      className="flex items-center justify-between gap-3 py-3 text-sm text-[var(--color-text-muted)] no-underline hover:bg-[var(--color-surface)] dark:text-[var(--color-text-muted-dark)] dark:hover:bg-[var(--color-surface-dark)]"
    >
      <span className="min-w-0 break-words">{suggestion.title}</span>
      <span aria-hidden="true" className="shrink-0 text-base leading-none">
        ›
      </span>
    </Link>
  )
}

export function HomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [tasks, setTasks] = useState<HomeTask[]>([])
  const [suggestion, setSuggestion] = useState<HomeSuggestion | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setError('Không có phiên đăng nhập.')
          setSummary(null)
          setTasks([])
          setSuggestion(null)
          setLoading(false)
        }
        return
      }

      const today = todayLocalIsoDate()
      const reviewedSince = localMidnightIso()

      const [decksResult, progressResult, dueResult, reviewedResult] = await Promise.all([
        supabase
          .from('decks')
          .select('id, name, created_at, vocab_items(count)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true }),
        supabase.from('user_vocab_progress').select('interval_days, due_date').eq('user_id', user.id),
        fetchAllProgressPages({ userId: user.id, dueDateLte: today }),
        fetchAllProgressPages({ userId: user.id, lastReviewedAtGte: reviewedSince }),
      ])

      if (cancelled) return

      if (decksResult.error || progressResult.error || dueResult.error || reviewedResult.error) {
        setError(
          decksResult.error?.message ??
            progressResult.error?.message ??
            dueResult.error?.message ??
            reviewedResult.error?.message ??
            'Không tải được dữ liệu.',
        )
        setSummary(null)
        setTasks([])
        setSuggestion(null)
        setLoading(false)
        return
      }

      const ownedDecks = (decksResult.data ?? []) as OwnedDeckRow[]
      const progressRows = (progressResult.data ?? []) as ProgressRow[]
      const ownedIds = new Set(ownedDecks.map((deck) => deck.id))
      const dueByDeck = countByOwnedDeck(dueResult.data, ownedIds)
      const reviewedByDeck = countByOwnedDeck(reviewedResult.data, ownedIds)
      const nextTasks = buildTasks(ownedDecks, dueByDeck, reviewedByDeck)
      const totalDueRemaining = ownedDecks.reduce(
        (sum, deck) => sum + (dueByDeck.get(deck.id) ?? 0),
        0,
      )

      const totalDecks = ownedDecks.length
      const totalWords = ownedDecks.reduce((sum, deck) => sum + vocabCount(deck), 0)
      const enrolledCount = progressRows.length
      const notEnrolledCount = totalWords - enrolledCount
      const graduatedCount = progressRows.filter((p) => p.interval_days >= 30).length
      const activeCount = progressRows.filter((p) => p.interval_days < 30).length
      const dueTodayCount = progressRows.filter((p) => p.due_date <= today).length

      let nextSuggestion: HomeSuggestion | null = null
      if (totalDueRemaining <= LOW_WORK_THRESHOLD) {
        let startDeck: OwnedDeckRow | null = null
        for (const deck of ownedDecks) {
          if (vocabCount(deck) === 0) continue
          const { data, error: startedError } = await supabase
            .from('user_vocab_progress')
            .select('id, vocab_items!inner(deck_id)')
            .eq('user_id', user.id)
            .eq('vocab_items.deck_id', deck.id)
            .limit(1)

          if (cancelled) return
          if (startedError) {
            setError(startedError.message)
            setSummary(null)
            setTasks([])
            setSuggestion(null)
            setLoading(false)
            return
          }
          if ((data ?? []).length === 0) {
            startDeck = deck
            break
          }
        }

        nextSuggestion = startDeck
          ? { to: `/decks/${startDeck.id}`, title: `Bắt đầu học: ${startDeck.name}` }
          : { to: '/decks?tab=public', title: 'Tìm deck công khai để học' }
      }

      if (cancelled) return

      setError(null)
      setSummary({
        totalDecks,
        totalWords,
        enrolledCount,
        notEnrolledCount,
        graduatedCount,
        activeCount,
        dueTodayCount,
      })
      setTasks(nextTasks)
      setSuggestion(nextSuggestion)
      setLoading(false)
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">Đang tải...</p>
  }

  if (error) {
    return <p className="text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">{error}</p>
  }

  if (!summary || summary.totalDecks === 0) {
    return (
      <div>
        <p>Chưa có deck nào.</p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Tạo deck đầu tiên bằng cách tải lên một file từ vựng, mỗi dòng một từ dạng từ tiếng Phần Lan;nghĩa.
        </p>
        <Link to="/decks/new" className={`${buttonPrimaryClassName} mt-6 inline-block no-underline`}>
          Tạo deck mới
        </Link>
      </div>
    )
  }

  const stats: { label: string; value: number; success?: boolean }[] = [
    { label: 'Tổng số deck', value: summary.totalDecks },
    { label: 'Tổng số từ', value: summary.totalWords },
    { label: 'Đã học', value: summary.enrolledCount },
    { label: 'Chưa học', value: summary.notEnrolledCount },
    { label: 'Đã thuộc', value: summary.graduatedCount, success: true },
    { label: 'Đang học', value: summary.activeCount },
  ]

  return (
    <div>
      <section className="rounded-base border border-[var(--color-border)] px-3 py-4 dark:border-[var(--color-border-dark)] sm:px-4">
        <h2 className="mb-1">Việc hôm nay</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
            Hôm nay không còn từ nào đến hạn.
          </p>
        ) : (
          <ul className="mt-2 list-none p-0">{tasks.map((task) => <TaskRow key={task.deckId} task={task} />)}</ul>
        )}
        {suggestion ? (
          <div
            className={
              tasks.length > 0
                ? 'mt-2 border-t border-[var(--color-border)] pt-3 dark:border-[var(--color-border-dark)]'
                : 'mt-3'
            }
          >
            <h3 className="text-sm font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
              Gợi ý
            </h3>
            <SuggestionRow suggestion={suggestion} />
          </div>
        ) : null}
      </section>

      <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
              {stat.label}
            </p>
            <p
              className={
                stat.success
                  ? 'mt-1 text-xl text-[var(--color-success)] dark:text-[var(--color-success-dark)]'
                  : 'mt-1 text-xl text-[var(--color-text)] dark:text-[var(--color-text-dark)]'
              }
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
