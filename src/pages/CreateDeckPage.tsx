import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { DeckForm } from '../components/DeckForm'
import { FileField } from '../components/FileField'
import { backLinkBlockClassName } from '../components/linkClasses'
import { ParseErrorList } from '../components/ParseErrorList'
import { VocabTable } from '../components/VocabTable'
import { parseDeckFile, type ParseError, type ValidLine } from '../lib/deckParser'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

function saveBlockedReason(args: {
  name: string
  poolSizeValid: boolean
  parsed: boolean
  fileName: string | null
  errors: ParseError[]
  validLines: ValidLine[]
  saving: boolean
}): string | null {
  if (args.saving) return null
  if (args.name.trim() === '') return 'Nhập tên deck.'
  if (!args.poolSizeValid) return 'Số từ học cùng lúc phải từ 10 đến 30.'
  if (!args.parsed || !args.fileName) return 'Chọn file từ vựng để tiếp tục.'
  if (args.errors.length > 0) return 'Sửa các lỗi trong file rồi chọn lại file.'
  if (args.validLines.length === 0) return 'File không có dòng hợp lệ nào.'
  return null
}

export function CreateDeckPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [meaningLanguage, setMeaningLanguage] = useState<Deck['meaning_language']>('vi')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Deck['visibility']>('private')
  const [activePoolSize, setActivePoolSize] = useState(20)
  const [validLines, setValidLines] = useState<ValidLine[]>([])
  const [errors, setErrors] = useState<ParseError[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const poolSizeValid =
    Number.isInteger(activePoolSize) && activePoolSize >= 10 && activePoolSize <= 30

  const canSave =
    errors.length === 0 &&
    validLines.length > 0 &&
    name.trim() !== '' &&
    poolSizeValid &&
    !saving

  const blockedReason = saveBlockedReason({
    name,
    poolSizeValid,
    parsed,
    fileName,
    errors,
    validLines,
    saving,
  })

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setSaveError(null)
    setValidLines([])
    setErrors([])
    setParsed(false)
    setFileName(null)

    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : ''
      const result = parseDeckFile(content)
      setValidLines(result.validLines)
      setErrors(result.errors)
      setFileName(file.name)
      setParsed(true)
    }
    reader.onerror = () => {
      setSaveError('Không đọc được file.')
      setParsed(false)
    }
    reader.readAsText(file)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return

    setSaving(true)
    setSaveError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaveError('Không có phiên đăng nhập.')
      setSaving(false)
      return
    }

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    const { data: deck, error: insertDeckError } = await supabase
      .from('decks')
      .insert({
        owner_id: user.id,
        name: trimmedName,
        meaning_language: meaningLanguage,
        description: trimmedDescription === '' ? null : trimmedDescription,
        visibility,
        active_pool_size: activePoolSize,
      })
      .select('id')
      .single()

    if (insertDeckError || !deck) {
      console.error(insertDeckError)
      setSaveError('Không tạo được deck. Thử lại sau.')
      setSaving(false)
      return
    }

    const rows = validLines.map((line) => ({
      deck_id: deck.id as string,
      finnish_word: line.finnishWord,
      translation: line.translation,
    }))

    const { error: insertVocabError } = await supabase.from('vocab_items').insert(rows)

    if (insertVocabError) {
      await supabase.from('decks').delete().eq('id', deck.id)
      console.error(insertVocabError)
      setSaveError('Không tạo được deck. Thử lại sau.')
      setSaving(false)
      return
    }

    navigate('/decks', { replace: true, state: { success: `Đã tạo deck «${trimmedName}».` } })
  }

  return (
    <div>
      <p>
          <Link to="/decks" className={backLinkBlockClassName}>
          ← Decks
        </Link>
      </p>
      <h1>Tạo deck mới</h1>

      <form className="mt-6" onSubmit={(e) => void handleSave(e)}>
        <DeckForm
          values={{ name, meaningLanguage, description, visibility, activePoolSize }}
          onNameChange={setName}
          onMeaningLanguageChange={setMeaningLanguage}
          onDescriptionChange={setDescription}
          onVisibilityChange={setVisibility}
          onActivePoolSizeChange={setActivePoolSize}
          poolSizeValid={poolSizeValid}
          disabled={saving}
          autoFocusName
        />

        <div className="mt-5 max-w-lg">
          <FileField
            label="File từ vựng (.txt, .csv)"
            accept=".txt,.csv,text/plain,text/csv"
            fileName={fileName}
            disabled={saving}
            hint="Mỗi dòng một từ, dạng: từ tiếng Phần Lan;nghĩa. Tối đa 500 dòng."
            onFileChange={handleFileChange}
          />
        </div>

        {parsed ? (
          <section className="mt-10">
            <h2>Xem trước</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
              {validLines.length} từ hợp lệ
              {' · '}
              <span
                className={
                  errors.length > 0
                    ? 'text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]'
                    : undefined
                }
              >
                {errors.length} lỗi
              </span>
            </p>
            {errors.length > 0 ? (
              <div className="mt-4">
                <ParseErrorList errors={errors} />
              </div>
            ) : null}
            {validLines.length > 0 ? (
              <div className="mt-6">
                <VocabTable
                  items={validLines.map((line) => ({
                    id: `${line.lineNumber}-${line.finnishWord}`,
                    finnish_word: line.finnishWord,
                    translation: line.translation,
                  }))}
                  caption="Danh sách từ hợp lệ để tạo deck"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {saveError ? (
          <p role="alert" className="mt-6 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger-dark)]">
            {saveError}
          </p>
        ) : null}

        <div className="mt-8">
          <Button type="submit" variant="primary" loading={saving} disabled={!canSave} className="w-full sm:w-auto">
            {saving ? 'Đang lưu…' : 'Lưu deck'}
          </Button>
          {!canSave && !saving && blockedReason ? (
            <p
              role="status"
              className="mt-2 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]"
            >
              {blockedReason}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  )
}
