import { useId, useRef, type ChangeEvent } from 'react'
import { buttonSecondaryClassName } from './Button'

type FileFieldProps = {
  label: string
  accept: string
  fileName: string | null
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  hint?: string
  error?: string
}

export function FileField({
  label,
  accept,
  fileName,
  onFileChange,
  disabled = false,
  hint,
  error,
}: FileFieldProps) {
  const generatedId = useId()
  const inputId = generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event)
    event.target.value = ''
  }

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="mb-1 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
      >
        {label}
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          className={`${buttonSecondaryClassName} disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={() => inputRef.current?.click()}
        >
          {fileName ? 'Đổi file' : 'Chọn file'}
        </button>
        <span className="min-w-0 truncate text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          {fileName ?? 'Chưa chọn file'}
        </span>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="sr-only"
      />
      {hint ? (
        <p id={hintId} className="mt-2 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          {hint}
        </p>
      ) : null}
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
}
