export type VocabStatus = 'Chưa học' | 'Đang học' | 'Đã thuộc'

export type VocabTableItem = {
  id: string
  finnish_word: string
  translation: string
  status?: VocabStatus
}

type VocabTableProps = {
  items: VocabTableItem[]
  showStatus?: boolean
  caption: string
}

function statusClassName(status: VocabStatus): string {
  if (status === 'Đã thuộc') {
    return 'text-[var(--color-success)] dark:text-[var(--color-success-dark)]'
  }
  if (status === 'Đang học') {
    return 'text-[var(--color-accent)] dark:text-[var(--color-accent-dark)]'
  }
  return 'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]'
}

export function VocabTable({ items, showStatus = false, caption }: VocabTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        Deck này chưa có từ vựng.
      </p>
    )
  }

  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          <th
            scope="col"
            className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
          >
            Tiếng Phần Lan
          </th>
          <th
            scope="col"
            className="py-2 pr-3 text-xs font-normal text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
          >
            Nghĩa
          </th>
          {showStatus ? (
            <th
              scope="col"
              className="hidden py-2 text-xs font-normal text-[var(--color-text-muted)] sm:table-cell dark:text-[var(--color-text-muted-dark)]"
            >
              Trạng thái
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="border-b border-[var(--color-border)] last:border-b-0 dark:border-[var(--color-border-dark)]"
          >
            <td className="py-3 pr-3 break-words text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              {item.finnish_word}
              {showStatus && item.status ? (
                <span className={`mt-0.5 block text-xs sm:hidden ${statusClassName(item.status)}`}>
                  {item.status}
                </span>
              ) : null}
            </td>
            <td className="py-3 pr-3 break-words text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
              {item.translation}
            </td>
            {showStatus && item.status ? (
              <td
                className={`hidden py-3 text-sm sm:table-cell ${statusClassName(item.status)}`}
              >
                {item.status}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
