import { useTheme } from '../lib/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-base border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:text-[var(--color-text-dark)] dark:hover:bg-[var(--color-surface-dark)]"
      aria-label="Chuyển giao diện sáng/tối"
    >
      {theme === 'dark' ? 'Sáng' : 'Tối'}
    </button>
  )
}
