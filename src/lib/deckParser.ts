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

const MAX_NON_BLANK_LINES = 500

export function parseDeckFile(content: string): { validLines: ValidLine[]; errors: ParseError[] } {
  const text = content.replace(/^\uFEFF/, '')
  // Split CR, LF, and CRLF. A lone \r is a line break, not part of the word.
  const lines = text.split(/\r\n|\r|\n/)

  let nonBlankCount = 0
  for (const line of lines) {
    if (line.trim() !== '') nonBlankCount++
  }

  // Cap counts non-blank lines only. Over the cap, return that single error.
  if (nonBlankCount > MAX_NON_BLANK_LINES) {
    return {
      validLines: [],
      errors: [
        {
          lineNumber: null,
          rawLine: '',
          reason: `File có ${nonBlankCount} dòng, tối đa ${MAX_NON_BLANK_LINES} dòng`,
        },
      ],
    }
  }

  const validLines: ValidLine[] = []
  const errors: ParseError[] = []
  const seen = new Map<string, number>()

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    // Original file line (1-based), including blank lines skipped above this one.
    const lineNumber = i + 1

    // Blank lines carry no word. Skip them quietly at any position.
    if (rawLine.trim() === '') continue

    const sep = rawLine.indexOf(';')
    if (sep === -1) {
      errors.push({
        lineNumber,
        rawLine,
        reason: 'Thiếu dấu ; giữa từ và nghĩa. Dạng đúng: từ;nghĩa',
      })
      continue
    }

    const finnishWord = rawLine.slice(0, sep).trim()
    const translation = rawLine.slice(sep + 1).trim()

    if (!finnishWord) {
      errors.push({ lineNumber, rawLine, reason: 'Thiếu từ tiếng Phần Lan trước dấu ;' })
      continue
    }

    if (!translation) {
      errors.push({ lineNumber, rawLine, reason: 'Thiếu nghĩa sau dấu ;' })
      continue
    }

    const key = finnishWord.toLowerCase()
    const firstLine = seen.get(key)
    if (firstLine !== undefined) {
      errors.push({
        lineNumber,
        rawLine,
        reason: `Từ «${finnishWord}» đã có ở dòng ${firstLine}`,
      })
      continue
    }

    seen.set(key, lineNumber)
    validLines.push({ lineNumber, finnishWord, translation })
  }

  return { validLines, errors }
}
