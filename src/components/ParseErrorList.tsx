import type { ParseError } from '../lib/deckParser'

type ParseErrorListProps = {
  errors: ParseError[]
  maxVisible?: number
}

export function ParseErrorList({ errors, maxVisible }: ParseErrorListProps) {
  const hiddenCount =
    maxVisible !== undefined && errors.length > maxVisible ? errors.length - maxVisible : 0
  const visible = hiddenCount > 0 && maxVisible !== undefined ? errors.slice(0, maxVisible) : errors

  return (
    <>
      <ul className="list-none p-0 sm:hidden">
        {visible.map((err, index) => (
          <li
            key={`${err.lineNumber ?? 'n'}-${index}`}
            className="border-b border-[var(--color-border)] py-3 last:border-b-0 dark:border-[var(--color-border-dark)]"
          >
            <p className="text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              Dòng {err.lineNumber ?? '—'} ·{' '}
              <span className="text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">{err.reason}</span>
            </p>
            <p className="mt-2 break-words font-mono text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
              {err.rawLine}
            </p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full border-collapse text-left sm:table">
        <caption className="sr-only">Các dòng lỗi trong file từ vựng</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
            <th
              scope="col"
              className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
            >
              Dòng
            </th>
            <th
              scope="col"
              className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
            >
              Nội dung gốc
            </th>
            <th
              scope="col"
              className="py-2 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
            >
              Lý do
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((err, index) => (
            <tr
              key={`${err.lineNumber ?? 'n'}-${index}`}
              className="border-b border-[var(--color-border)] last:border-b-0 dark:border-[var(--color-border-dark)]"
            >
              <td className="py-3 pr-3 text-sm text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                {err.lineNumber ?? '—'}
              </td>
              <td className="py-3 pr-3 break-words font-mono text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                {err.rawLine}
              </td>
              <td className="py-3 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
                {err.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Còn {hiddenCount} lỗi khác. Sửa các lỗi trên rồi chọn lại file để xem tiếp.
        </p>
      ) : null}
    </>
  )
}
