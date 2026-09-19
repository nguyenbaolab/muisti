import type { ReactNode } from 'react'
import { languageLabel, visibilityLabel } from '../lib/deckLabels'
import type { Deck } from '../types/database'

type DeckHeaderProps = {
  name: string
  description?: string | null
  meaningLanguage: Deck['meaning_language']
  wordCount: number
  visibility?: Deck['visibility']
  sharedBy?: string
  actions?: ReactNode
}

export function DeckHeader({
  name,
  description,
  meaningLanguage,
  wordCount,
  visibility,
  sharedBy,
  actions,
}: DeckHeaderProps) {
  const metaParts = [`Nghĩa: ${languageLabel(meaningLanguage)}`]
  if (visibility) metaParts.push(visibilityLabel(visibility))
  metaParts.push(`${wordCount} từ`)
  if (sharedBy) metaParts.push(`Chia sẻ bởi ${sharedBy}`)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="mb-0 min-w-0 flex-1 break-words">{name}</h1>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {description ? (
        <p className="mt-2 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          {description}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        {metaParts.join(' · ')}
      </p>
    </div>
  )
}
