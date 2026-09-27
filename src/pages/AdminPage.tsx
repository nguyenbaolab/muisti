import { useEffect, useMemo, useState } from 'react'
import { Input } from '../components/Input'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

type AdminProfileRow = Pick<Profile, 'id' | 'email' | 'is_admin' | 'daily_exercise_quota'>

export function AdminPage() {
  const [rows, setRows] = useState<AdminProfileRow[]>([])
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfiles() {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setError('Không có phiên đăng nhập.')
          setRows([])
          setQuotaDrafts({})
          setLoading(false)
        }
        return
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, is_admin, daily_exercise_quota')
        .order('email', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setRows([])
        setQuotaDrafts({})
        setLoading(false)
        return
      }

      const profileRows = (data ?? []) as AdminProfileRow[]
      const drafts: Record<string, string> = {}
      for (const row of profileRows) {
        drafts[row.id] = String(row.daily_exercise_quota)
      }

      setRows(profileRows)
      setQuotaDrafts(drafts)
      setLoading(false)
    }

    void loadProfiles()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.email.toLowerCase().includes(q))
  }, [rows, search])

  function markSaving(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (saving) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      if (message === null) {
        if (!(id in prev)) return prev
        const rest = { ...prev }
        delete rest[id]
        return rest
      }
      return { ...prev, [id]: message }
    })
  }

  async function saveQuota(row: AdminProfileRow) {
    const draft = quotaDrafts[row.id] ?? String(row.daily_exercise_quota)
    const trimmed = draft.trim()
    const parsed = Number(trimmed)

    if (trimmed === '' || !Number.isInteger(parsed) || parsed < 0) {
      setRowError(row.id, 'Quota phải là số nguyên ≥ 0.')
      return
    }

    if (parsed === row.daily_exercise_quota) {
      setRowError(row.id, null)
      setQuotaDrafts((prev) => ({ ...prev, [row.id]: String(parsed) }))
      return
    }

    markSaving(row.id, true)
    setRowError(row.id, null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ daily_exercise_quota: parsed })
      .eq('id', row.id)

    markSaving(row.id, false)

    if (updateError) {
      setRowError(row.id, updateError.message)
      return
    }

    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, daily_exercise_quota: parsed } : r)),
    )
    setQuotaDrafts((prev) => ({ ...prev, [row.id]: String(parsed) }))
  }

  async function saveIsAdmin(row: AdminProfileRow, nextValue: boolean) {
    if (nextValue === row.is_admin) return

    const previous = row.is_admin
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_admin: nextValue } : r)))
    markSaving(row.id, true)
    setRowError(row.id, null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: nextValue })
      .eq('id', row.id)

    markSaving(row.id, false)

    if (updateError) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_admin: previous } : r)))
      setRowError(row.id, updateError.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
        Admin
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        Chỉnh hạn mức sinh bài mỗi ngày và quyền admin cho từng tài khoản.
      </p>

      <div className="mt-6 max-w-sm">
        <Input
          label="Tìm theo email"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="email@"
          autoComplete="off"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Đang tải...
        </p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-6 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          {rows.length === 0 ? 'Chưa có user nào.' : 'Không có email khớp tìm kiếm.'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Danh sách user và quota sinh bài</caption>
            <thead>
              <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                <th
                  scope="col"
                  className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
                >
                  Quota / ngày
                </th>
                <th
                  scope="col"
                  className="py-2 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
                >
                  Admin
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const saving = savingIds.has(row.id)
                const rowError = rowErrors[row.id]
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--color-border)] last:border-b-0 dark:border-[var(--color-border-dark)]"
                  >
                    <td className="py-3 pr-3 break-all text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                      {row.email}
                      {rowError ? (
                        <p
                          role="alert"
                          className="mt-1 text-xs text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
                        >
                          {rowError}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        disabled={saving}
                        value={quotaDrafts[row.id] ?? String(row.daily_exercise_quota)}
                        onChange={(e) => {
                          const value = e.target.value
                          setQuotaDrafts((prev) => ({ ...prev, [row.id]: value }))
                          setRowError(row.id, null)
                        }}
                        onBlur={() => {
                          void saveQuota(row)
                        }}
                        aria-label={`Quota hàng ngày cho ${row.email}`}
                        className="w-24 rounded-base border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] disabled:opacity-50 dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)] dark:text-[var(--color-text-dark)]"
                      />
                    </td>
                    <td className="py-3 align-top">
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                        <input
                          type="checkbox"
                          checked={row.is_admin}
                          disabled={saving}
                          onChange={(e) => {
                            void saveIsAdmin(row, e.target.checked)
                          }}
                          aria-label={`Admin cho ${row.email}`}
                          className="size-4 accent-[var(--color-accent)]"
                        />
                        <span className="sr-only sm:not-sr-only sm:text-xs sm:text-[var(--color-text-muted)] dark:sm:text-[var(--color-text-muted-dark)]">
                          {row.is_admin ? 'Có' : 'Không'}
                        </span>
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
