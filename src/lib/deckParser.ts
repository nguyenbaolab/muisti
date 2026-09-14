export interface ValidLine {
  lineNumber: number
  finnishWord: string
  translation: string
}

export interface ParseError {
  lineNumber: number | null
  rawLine: string
  reason: string
}

export function parseDeckFile(content: string): { validLines: ValidLine[]; errors: ParseError[] } {
  const text = content.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/)

  if (lines.length > 500) {
    return {
      validLines: [],
      errors: [{ lineNumber: null, rawLine: '', reason: 'File vượt quá 500 dòng' }],
    }
  }

  const validLines: ValidLine[] = []
  const errors: ParseError[] = []
  const seen = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const lineNumber = i + 1

    if (rawLine.trim() === '') {
      errors.push({ lineNumber, rawLine, reason: 'Dòng trống' })
      continue
    }

    const sep = rawLine.indexOf(';')
    if (sep === -1) {
      errors.push({ lineNumber, rawLine, reason: 'Thiếu dấu phân cách ;' })
      continue
    }

    const finnishWord = rawLine.slice(0, sep).trim()
    const translation = rawLine.slice(sep + 1).trim()

    if (!finnishWord) {
      errors.push({ lineNumber, rawLine, reason: 'Thiếu từ tiếng Phần Lan' })
      continue
    }

    if (!translation) {
      errors.push({ lineNumber, rawLine, reason: 'Thiếu nghĩa' })
      continue
    }

    const key = finnishWord.toLowerCase()
    const firstLine = seen.get(key)
    if (firstLine !== undefined) {
      errors.push({ lineNumber, rawLine, reason: `Trùng với dòng ${firstLine}` })
      continue
    }

    seen.set(key, lineNumber)
    validLines.push({ lineNumber, finnishWord, translation })
  }

  return { validLines, errors }
}
