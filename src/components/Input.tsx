import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', label, error, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  const borderClass = error
    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] dark:border-[var(--color-danger-dark)] dark:focus:border-[var(--color-danger-dark)]'
    : 'border-[var(--color-border)] focus:border-[var(--color-accent)] dark:border-[var(--color-border-dark)]'

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
        >
          {label}
        </label>
      ) : null}
      <input
        {...props}
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-base border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none dark:bg-[var(--color-surface-dark)] dark:text-[var(--color-text-dark)] ${borderClass} ${className}`}
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

Input.displayName = 'Input'
