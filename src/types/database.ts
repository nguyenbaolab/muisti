export interface Deck {
  id: string
  owner_id: string
  name: string
  meaning_language: 'en' | 'vi'
  description: string | null
  visibility: 'public' | 'private'
  active_pool_size: number
  created_at: string
}

export interface VocabItem {
  id: string
  deck_id: string
  finnish_word: string
  translation: string
  created_at: string
}

export interface UserVocabProgress {
  id: string
  user_id: string
  vocab_item_id: string
  ease_factor: number
  interval_days: number
  due_date: string
  review_count: number
  last_reviewed_at: string | null
}

export interface ReviewQueueItem {
  progressId: string
  vocabItemId: string
  finnishWord: string
  translation: string
  easeFactor: number
  intervalDays: number
  reviewCount: number
}
