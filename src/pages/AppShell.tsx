import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

export function AppShell() {
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

  return (
    <main>
      <h1>Muisti</h1>

      {loading ? (
        <p>Đang tải...</p>
      ) : error ? (
        <p>{error}</p>
      ) : summary && summary.totalDecks > 0 ? (
        <ul>
          <li>Tổng số deck: {summary.totalDecks}</li>
          <li>Tổng số từ: {summary.totalWords}</li>
          <li>
            Đã học: {summary.enrolledCount} / Chưa học: {summary.notEnrolledCount}
          </li>
          <li>
            Đã thuộc: {summary.graduatedCount} / Đang học: {summary.activeCount}
          </li>
          <li>Due hôm nay: {summary.dueTodayCount}</li>
        </ul>
      ) : (
        <p>
          Chưa có deck nào — tạo deck đầu tiên của bạn.{' '}
          <Link to="/decks/new">Tạo deck mới</Link>
        </p>
      )}

      <p>
        <Link to="/decks">Decks</Link>
      </p>
      <p>
        <Link to="/review">Ôn tập hôm nay</Link>
      </p>
      <button type="button" onClick={() => void supabase.auth.signOut()}>
        Đăng xuất
      </button>
    </main>
  )
}
