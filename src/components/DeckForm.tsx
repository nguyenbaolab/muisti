import { visibilityLabel } from '../lib/deckLabels'
import type { Deck } from '../types/database'
import { Input } from './Input'
import { RadioGroup } from './RadioGroup'
import { Select } from './Select'
import { Textarea } from './Textarea'

export type DeckFormValues = {
  name: string
  meaningLanguage: Deck['meaning_language']
  description: string
  visibility: Deck['visibility']
  activePoolSize: number
}

type DeckFormProps = {
  values: DeckFormValues
  onNameChange: (name: string) => void
  onMeaningLanguageChange: (code: Deck['meaning_language']) => void
  onDescriptionChange: (description: string) => void
  onVisibilityChange: (visibility: Deck['visibility']) => void
  onActivePoolSizeChange: (size: number) => void
  poolSizeValid: boolean
  disabled?: boolean
  autoFocusName?: boolean
}

export function DeckForm({
  values,
  onNameChange,
  onMeaningLanguageChange,
  onDescriptionChange,
  onVisibilityChange,
  onActivePoolSizeChange,
  poolSizeValid,
  disabled = false,
  autoFocusName = false,
}: DeckFormProps) {
  return (
    <div className="flex max-w-lg flex-col gap-5">
      <Input
        label="Tên deck"
        type="text"
        value={values.name}
        required
        disabled={disabled}
        autoFocus={autoFocusName}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <Select
        label="Ngôn ngữ nghĩa"
        value={values.meaningLanguage}
        required
        disabled={disabled}
        onChange={(event) => onMeaningLanguageChange(event.target.value as Deck['meaning_language'])}
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </Select>
      <Textarea
        label="Mô tả (không bắt buộc)"
        value={values.description}
        disabled={disabled}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
      <RadioGroup
        legend="Chế độ hiển thị"
        name="visibility"
        value={values.visibility}
        disabled={disabled}
        onChange={(next) => onVisibilityChange(next as Deck['visibility'])}
        options={[
          {
            value: 'private',
            label: visibilityLabel('private'),
            description: 'Chỉ mình bạn thấy deck này.',
          },
          {
            value: 'public',
            label: visibilityLabel('public'),
            description: 'Người khác có thể xem trước và clone deck này.',
          },
        ]}
      />
      <div>
        <Input
          label="Số từ học cùng lúc"
          type="number"
          min={10}
          max={30}
          step={1}
          required
          disabled={disabled}
          value={values.activePoolSize}
          error={poolSizeValid ? undefined : 'Nhập số nguyên từ 10 đến 30.'}
          onChange={(event) => onActivePoolSizeChange(Number(event.target.value))}
        />
        <p className="mt-2 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Hệ thống tự thêm từ mới khi bạn đã học vững các từ đang ôn.
        </p>
      </div>
    </div>
  )
}
