export interface Unit {
  id: string
  book_code: string
  unit_number: number
  title: string
  description: string | null
  created_at: string
}

export interface VocabItem {
  id: string
  unit_id: string
  finnish_word: string
  translation: string
  part_of_speech: string | null
  example_sentence: string | null
  notes: string | null
  created_at: string
}

export interface Exercise {
  id: string
  unit_id: string
  type: string
  prompt: string
  scene_description: string | null
  correct_answer: unknown
  options: unknown
  created_at: string
}
