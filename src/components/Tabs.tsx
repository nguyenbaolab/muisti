import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export type TabItem<T extends string = string> = {
  id: T
  label: string
  count?: number
}

type TabsProps<T extends string> = {
  tabs: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel: string
  idPrefix: string
  className?: string
}

export function tabButtonId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-tab-${tabId}`
}

export function tabPanelId(idPrefix: string): string {
  return `${idPrefix}-tabpanel`
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  idPrefix,
  className = '',
}: TabsProps<T>) {
  const buttonRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({})
  const panelId = tabPanelId(idPrefix)

  function activate(id: T) {
    onChange(id)
    buttonRefs.current[id]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((tab) => tab.id === value)
    if (index === -1 || tabs.length === 0) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      activate(tabs[(index + 1) % tabs.length].id)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      activate(tabs[(index - 1 + tabs.length) % tabs.length].id)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      activate(tabs[0].id)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      activate(tabs[tabs.length - 1].id)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-6 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              buttonRefs.current[tab.id] = el
            }}
            type="button"
            role="tab"
            id={tabButtonId(idPrefix, tab.id)}
            aria-controls={panelId}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={
              selected
                ? 'relative -mb-px border-b-2 border-[var(--color-accent)] pb-2 text-sm text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] dark:border-[var(--color-accent-dark)] dark:text-[var(--color-text-dark)] dark:focus-visible:outline-[var(--color-accent-dark)]'
                : 'pb-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] dark:text-[var(--color-text-muted-dark)] dark:hover:text-[var(--color-text-dark)] dark:focus-visible:outline-[var(--color-accent-dark)]'
            }
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="ml-1.5 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

type TabPanelProps = {
  idPrefix: string
  labelledBy: string
  children: ReactNode
  className?: string
}

export function TabPanel({ idPrefix, labelledBy, children, className = '' }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={tabPanelId(idPrefix)}
      aria-labelledby={tabButtonId(idPrefix, labelledBy)}
      className={className}
    >
      {children}
    </div>
  )
}
