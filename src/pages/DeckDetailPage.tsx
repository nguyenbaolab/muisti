import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, buttonPrimaryClassName, buttonSecondaryClassName } from '../components/Button'
import { DeckHeader } from '../components/DeckHeader'
import { TabPanel, Tabs } from '../components/Tabs'
import { backLinkBlockClassName } from '../components/linkClasses'
import { VocabTable } from '../components/VocabTable'
import { DECK_SESSION_LIMIT } from '../lib/sessionLimits'
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

function wordsWithProgress(vocabItems: VocabRow[], progress: ProgressRow[]): WordRow[] {
  const intervalByVocabId = new Map(progress.map((row) => [row.vocab_item_id, row.interval_days]))
  return vocabItems.map((item) => ({
    ...item,
    status: wordStatus(intervalByVocabId.get(item.id)),
  }))
}

function fetchDeckProgress(userId: string, deckId: string) {
  return supabase
    .from('user_vocab_progress')
    .select('vocab_item_id, interval_days, due_date, last_reviewed_at, vocab_items!inner(deck_id)')
    .eq('user_id', userId)
    .eq('vocab_items.deck_id', deckId)
}

export function DeckDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [status, setStatus] = useState<PageStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deck, setDeck] = useState<Deck | null>(null)
  const [words, setWords] = useState<WordRow[]>([])
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('words')
  const [resetting, setResetting] = useState(false)

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
          .eq('deck_id', id)
          .order('created_at', { ascending: true }),
        fetchDeckProgress(user.id, id),
      ])

      if (cancelled) return

      if (vocabResult.error || progressResult.error) {
        setLoadError(vocabResult.error?.message ?? progressResult.error?.message ?? 'Không tải được dữ liệu.')
        setStatus('error')
        return
      }

      const vocabItems = (vocabResult.data ?? []) as VocabRow[]
      const progress = (progressResult.data ?? []) as ProgressRow[]

      setDeck(loadedDeck)
      setProgressRows(progress)
      setWords(wordsWithProgress(vocabItems, progress))
      setActionError(null)
      setStatus('ready')
    }

    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleResetDeck() {
    if (!id || resetting) return

    const ok = window.confirm(
      'Học lại từ đầu sẽ xóa toàn bộ tiến độ ôn tập của deck này (bao gồm số lần đã ôn). Từ vựng trong deck vẫn giữ nguyên. Không thể hoàn tác. Tiếp tục?',
    )
    if (!ok) return

    setResetting(true)
    setActionError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setActionError('Không có phiên đăng nhập.')
      setResetting(false)
      return
    }

    // DELETE cannot filter via vocab_items!inner join like SELECT — use ids from loaded words.
    const vocabIds = words.map((w) => w.id)
    const { error: deleteError } = await supabase
      .from('user_vocab_progress')
      .delete()
      .eq('user_id', user.id)
      .in('vocab_item_id', vocabIds)

    if (deleteError) {
      setActionError(deleteError.message || 'Không xóa được tiến độ. Thử lại sau.')
      setResetting(false)
      return
    }

    const progressResult = await fetchDeckProgress(user.id, id)
    if (progressResult.error) {
      setActionError(progressResult.error.message || 'Đã xóa tiến độ nhưng không tải lại được dữ liệu.')
      setResetting(false)
      return
    }

    const progress = (progressResult.data ?? []) as ProgressRow[]
    setProgressRows(progress)
    setWords((prev) =>
      wordsWithProgress(
        prev.map(({ id: wordId, finnish_word, translation }) => ({
          id: wordId,
          finnish_word,
          translation,
        })),
        progress,
      ),
    )
    setResetting(false)
  }

  if (status === 'loading') {
    return (
      <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">Đang tải...</p>
    )
  }

  if (status === 'notfound') {
    return (
      <div>
        <h1>Deck</h1>
        <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Không tìm thấy deck.
        </p>
        <p className="mt-4">
          <Link to="/decks" className={backLinkBlockClassName}>
            ← Decks
          </Link>
        </p>
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <div>
        <h1>Deck</h1>
        <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Bạn không có quyền xem trang này. Trang chi tiết chỉ dành cho chủ deck.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {id ? (
            <Link to={`/decks/${id}/preview`} className={backLinkBlockClassName}>
              Xem trước deck
            </Link>
          ) : null}
          <Link to="/decks" className={backLinkBlockClassName}>
            ← Decks
          </Link>
        </p>
      </div>
    )
  }

  if (status === 'error' || !deck || !id) {
    return (
      <div>
        <h1>Deck</h1>
        <p role="alert" className="text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
          {loadError ?? 'Không tải được dữ liệu.'}
        </p>
        <p className="mt-4">
          <Link to="/decks" className={backLinkBlockClassName}>
            ← Decks
          </Link>
        </p>
      </div>
    )
  }

  const today = todayLocalIsoDate()
  const totalWords = words.length
  const enrolledProgress = progressRows.length
  const notEnrolledCount = totalWords - enrolledProgress
  const graduatedCount = progressRows.filter((p) => p.interval_days >= 30).length
  const activeCount = progressRows.filter((p) => p.interval_days < 30).length
  const dueTodayCount = progressRows.filter((p) => p.due_date <= today).length
  const extraCandidatesCount = progressRows.filter(
    (p) => p.interval_days < 30 && p.due_date > today,
  ).length
  const showExtraPractice = dueTodayCount === 0 && extraCandidatesCount > 0
  const isGraduated = totalWords > 0 && notEnrolledCount === 0 && graduatedCount === totalWords
  const startedLabel = new Date(deck.created_at).toLocaleDateString('vi-VN')
  const reviewedDates = new Set(
    progressRows
      .filter((p) => p.last_reviewed_at !== null)
      .map((p) => localIsoDateFromTimestamp(p.last_reviewed_at as string)),
  )
  const estimatedDaysStudied = reviewedDates.size

  const summaryStats: { label: string; value: number; success?: boolean }[] = [
    { label: 'Tổng số từ', value: totalWords },
    { label: 'Đã học', value: enrolledProgress },
    { label: 'Chưa học', value: notEnrolledCount },
    { label: 'Đã thuộc', value: graduatedCount, success: true },
    { label: 'Đang học', value: activeCount },
    { label: 'Đến hạn hôm nay', value: dueTodayCount },
  ]

  return (
    <div>
      <p>
        <Link to="/decks" className={backLinkBlockClassName}>
          ← Decks
        </Link>
      </p>

      <DeckHeader
        name={deck.name}
        description={deck.description}
        meaningLanguage={deck.meaning_language}
        wordCount={words.length}
        visibility={deck.visibility}
        actions={
          <>
            <Link to={`/review/${id}`} className={`${buttonPrimaryClassName} no-underline`}>
              Bắt đầu ôn tập
            </Link>
            {showExtraPractice ? (
              <Link to={`/review/${id}/extra`} className={`${buttonSecondaryClassName} no-underline`}>
                Ôn thêm (không tính vào lịch)
              </Link>
            ) : null}
            <Link to={`/decks/${id}/edit`} className={`${buttonSecondaryClassName} no-underline`}>
              Sửa
            </Link>
            {isGraduated ? (
              <Button
                type="button"
                variant="secondary"
                loading={resetting}
                disabled={resetting}
                onClick={() => void handleResetDeck()}
              >
                {resetting ? 'Đang xóa tiến độ…' : 'Học lại từ đầu'}
              </Button>
            ) : null}
          </>
        }
      />
      <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        Bắt đầu ôn tập sẽ ôn các từ đến hạn (tối đa {DECK_SESSION_LIMIT} từ mỗi phiên) và thêm từ mới cho đủ số từ học cùng lúc của deck.
      </p>
      {showExtraPractice ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Bạn đã ôn xong bài hôm nay. "Ôn thêm" cho bạn luyện các từ đang học sắp đến hạn. Kết quả
          chỉ để luyện tập, không thay đổi lịch ôn và không làm từ tốt nghiệp sớm hơn.
        </p>
      ) : null}
      {isGraduated ? (
        <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Chúc mừng! Bạn đã tốt nghiệp toàn bộ deck này. Mọi từ đều đã thuộc lâu dài.
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-2 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
          {actionError}
        </p>
      ) : null}

      <Tabs
        idPrefix="deck-detail"
        ariaLabel="Nội dung deck"
        value={activeTab}
        onChange={setActiveTab}
        className="mt-6"
        tabs={[
          { id: 'words', label: 'Từ vựng' },
          { id: 'summary', label: 'Tổng kết' },
        ]}
      />

      <TabPanel idPrefix="deck-detail" labelledBy={activeTab} className="mt-6">
        {activeTab === 'words' ? (
          <>
            <p className="mb-4 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
              Chưa học: chưa bắt đầu. Đang học: đang ôn. Đã thuộc: nhớ chắc, được ôn thưa. Nếu sai lại thì từ quay về học.
            </p>
            <VocabTable
              items={words}
              showStatus
              caption={`Danh sách từ vựng của deck ${deck.name}`}
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
              {summaryStats.map((stat) => (
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
            <div className="mt-8 space-y-1 border-t border-[var(--color-border)] pt-6 dark:border-[var(--color-border-dark)]">
              <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                Đã học gồm cả Đã thuộc. Đến hạn hôm nay gồm cả từ đã quá hạn.
              </p>
              <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                Bắt đầu học từ: {startedLabel} (ước lượng theo ngày tạo deck)
              </p>
              <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                Số ngày đã ôn (ước lượng): {estimatedDaysStudied} ngày
              </p>
              <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                Số liệu ước lượng dựa trên lần ôn gần nhất của mỗi từ, có thể thấp hơn thực tế.
              </p>
            </div>
          </>
        )}
      </TabPanel>
    </div>
  )
}
