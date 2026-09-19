import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = '', label, error, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const errorId = `${textareaId}-error`

  const borderClass = error
    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] dark:border-[var(--color-danger-dark)] dark:focus:border-[var(--color-danger-dark)]'
    : 'border-[var(--color-border)] focus:border-[var(--color-accent)] dark:border-[var(--color-border-dark)]'

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={textareaId}
          className="mb-1 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
        >
          {label}
        </label>
      ) : null}
      <textarea
        {...props}
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-y rounded-base border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none dark:bg-[var(--color-surface-dark)] dark:text-[var(--color-text-dark)] ${borderClass} ${className}`}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
})

Textarea.displayName = 'Textarea'
