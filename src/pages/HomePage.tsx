import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonPrimaryClassName } from '../components/Button'
import { supabase } from '../lib/supabase'
import { todayLocalIsoDate } from '../lib/srs'

type OwnedDeckRow = {
  id: string
  vocab_items: { count: number }[] | null
}

type ProgressRow = {
  interval_days: number
  due_date: string
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

function vocabCount(deck: OwnedDeckRow): number {
  return deck.vocab_items?.[0]?.count ?? 0
}

export function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<AccountSummary | null>(null)

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
          setLoading(false)
        }
        return
      }

      const [decksResult, progressResult] = await Promise.all([
        supabase.from('decks').select('id, vocab_items(count)').eq('owner_id', user.id),
        supabase.from('user_vocab_progress').select('interval_days, due_date').eq('user_id', user.id),
      ])

      if (cancelled) return

      if (decksResult.error || progressResult.error) {
        setError(decksResult.error?.message ?? progressResult.error?.message ?? 'Không tải được dữ liệu.')
        setSummary(null)
        setLoading(false)
        return
      }

      const ownedDecks = (decksResult.data ?? []) as OwnedDeckRow[]
      const progressRows = (progressResult.data ?? []) as ProgressRow[]

      const totalDecks = ownedDecks.length
      const totalWords = ownedDecks.reduce((sum, deck) => sum + vocabCount(deck), 0)
      const enrolledCount = progressRows.length
      const notEnrolledCount = totalWords - enrolledCount
      const graduatedCount = progressRows.filter((p) => p.interval_days >= 30).length
      const activeCount = progressRows.filter((p) => p.interval_days < 30).length
      const today = todayLocalIsoDate()
      const dueTodayCount = progressRows.filter((p) => p.due_date <= today).length

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
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
            Đến hạn hôm nay
          </p>
          <p className="text-5xl font-light tracking-tight text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
            {summary.dueTodayCount}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/review')}>
          Ôn tập
        </Button>
      </div>

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
