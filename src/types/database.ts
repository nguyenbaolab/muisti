export interface Profile {
  id: string
  email: string
  is_admin: boolean
  daily_exercise_quota: number
}

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

export type ExerciseType = 'fill_blank' | 'mcq'

export type FillBlankContent = { prompt: string; answer: string }
export type McqContent = { prompt: string; options: string[]; correct: string }
export type ExerciseContent = FillBlankContent | McqContent

/** content jsonb: fill_blank → prompt/answer; mcq → prompt/options/correct (Worker + PracticePage). */
export interface GeneratedExercise {
  id: string
  vocab_item_id: string
  exercise_type: ExerciseType
  content: ExerciseContent
  times_shown: number
  cooldown_until: string | null
  created_at: string
}

export interface ExerciseQuotaUsage {
  user_id: string
  usage_date: string
  generations_used: number
}
