import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parseDeckFile, type ParseError, type ValidLine } from '../lib/deckParser'
import { supabase } from '../lib/supabase'
import type { Deck } from '../types/database'

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
      setSaveError(insertDeckError?.message ?? 'Không tạo được deck.')
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
      setSaveError(insertVocabError.message)
      setSaving(false)
      return
    }

    navigate('/decks', { replace: true, state: { success: `Đã tạo deck «${trimmedName}».` } })
  }

  return (
    <main>
      <p>
        <Link to="/decks">← Decks</Link>
      </p>
      <h1>Tạo deck mới</h1>

      <form onSubmit={(e) => void handleSave(e)}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Tên deck
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', maxWidth: 480, marginTop: 4 }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Ngôn ngữ nghĩa
          <select
            value={meaningLanguage}
            onChange={(e) => setMeaningLanguage(e.target.value as Deck['meaning_language'])}
            required
            style={{ display: 'block', marginTop: 4 }}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Mô tả (không bắt buộc)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ display: 'block', width: '100%', maxWidth: 480, marginTop: 4 }}
          />
        </label>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 12px' }}>
          <legend>Visibility</legend>
          <label style={{ display: 'block' }}>
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={visibility === 'private'}
              onChange={() => setVisibility('private')}
            />{' '}
            private
          </label>
          <label style={{ display: 'block' }}>
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
            />{' '}
            public
          </label>
        </fieldset>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Số từ học cùng lúc
          <input
            type="number"
            min={10}
            max={30}
            step={1}
            value={activePoolSize}
            onChange={(e) => setActivePoolSize(Number(e.target.value))}
            required
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>
        <p style={{ marginTop: -8, marginBottom: 12, maxWidth: 480 }}>
          Hệ thống tự thêm từ mới khi bạn đã học vững các từ đang ôn.
        </p>
        {!poolSizeValid ? (
          <p style={{ color: 'crimson' }}>Nhập số nguyên từ 10 đến 30.</p>
        ) : null}

        <label style={{ display: 'block', marginBottom: 12 }}>
          File từ vựng (.txt, .csv)
          <input
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleFileChange}
            style={{ display: 'block', marginTop: 4 }}
          />
        </label>

        {fileName ? <p>File: {fileName}</p> : null}

        {parsed ? (
          <section>
            <h2>Preview</h2>
            <p>{validLines.length} từ hợp lệ</p>
            {validLines.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tiếng Phần Lan</th>
                    <th>Nghĩa</th>
                  </tr>
                </thead>
                <tbody>
                  {validLines.map((line, index) => (
                    <tr key={`${line.lineNumber}-${line.finnishWord}`}>
                      <td>{index + 1}</td>
                      <td>{line.finnishWord}</td>
                      <td>{line.translation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            <p style={{ color: errors.length > 0 ? 'crimson' : undefined }}>
              {errors.length} lỗi
            </p>
            {errors.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Dòng</th>
                    <th>Nội dung gốc</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err, index) => (
                    <tr key={`${err.lineNumber ?? 'n'}-${index}`} style={{ background: '#fff3cd' }}>
                      <td>{err.lineNumber ?? '—'}</td>
                      <td>{err.rawLine}</td>
                      <td>{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
        ) : null}

        {saveError ? <p style={{ color: 'crimson' }}>{saveError}</p> : null}

        <p>
          <button type="submit" disabled={!canSave}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </p>
      </form>
    </main>
  )
}
