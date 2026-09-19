import { useId } from 'react'

export type RadioOption = {
  value: string
  label: string
  description?: string
}

type RadioGroupProps = {
  legend: string
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  disabled?: boolean
}

export function RadioGroup({ legend, name, value, onChange, options, disabled = false }: RadioGroupProps) {
  const groupId = useId()

  return (
    <fieldset className="w-full border-0 p-0">
      <legend className="mb-2 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
        {legend}
      </legend>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          return (
            <label key={option.value} htmlFor={optionId} className="flex cursor-pointer items-start gap-2.5">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="mt-1 accent-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] dark:accent-[var(--color-accent-dark)] dark:focus-visible:outline-[var(--color-accent-dark)]"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text-dark)]">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
