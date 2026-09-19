import type { Deck } from '../types/database'

export function languageLabel(code: Deck['meaning_language']): string {
  return code === 'en' ? 'Anh' : 'Việt'
}

export function visibilityLabel(visibility: Deck['visibility']): string {
  return visibility === 'public' ? 'Công khai' : 'Riêng tư'
}

export function sharerNameFromEmail(email: string | null | undefined): string {
  if (!email) return 'Ẩn danh'
  const atIndex = email.indexOf('@')
  return atIndex === -1 ? email : email.slice(0, atIndex)
}
