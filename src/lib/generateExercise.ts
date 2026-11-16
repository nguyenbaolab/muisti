import { supabase } from './supabase'
import type { ExerciseContent, ExerciseType } from '../types/database'

export type GenerateExerciseOk = {
  ok: true
  exercise: {
    id: string
    exercise_type: ExerciseType
    content: ExerciseContent
  }
}

export type GenerateExerciseErr = {
  ok: false
  status: number
  error: string
  detail?: string
}

export type GenerateExerciseResult = GenerateExerciseOk | GenerateExerciseErr

function isFillBlank(value: unknown): value is { prompt: string; answer: string } {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return typeof o.prompt === 'string' && typeof o.answer === 'string'
}

function isMcq(value: unknown): value is { prompt: string; options: string[]; correct: string } {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  if (typeof o.prompt !== 'string' || typeof o.correct !== 'string') return false
  if (!Array.isArray(o.options) || o.options.length !== 4) return false
  if (!o.options.every((x) => typeof x === 'string')) return false
  return o.options.includes(o.correct)
}

function parseContent(exerciseType: ExerciseType, raw: unknown): ExerciseContent | null {
  if (exerciseType === 'fill_blank') return isFillBlank(raw) ? raw : null
  return isMcq(raw) ? raw : null
}

/** Worker rejects exclude_ids longer than this. Keep the newest ids, oldest-first. */
const MAX_EXCLUDE_IDS = 50

function excludeIdsForRequest(excludeIds: readonly string[] | undefined): string[] {
  if (!excludeIds || excludeIds.length === 0) return []
  if (excludeIds.length <= MAX_EXCLUDE_IDS) return [...excludeIds]
  return excludeIds.slice(excludeIds.length - MAX_EXCLUDE_IDS)
}

/**
 * POST /api/generate-exercise with the current Supabase access token.
 * Same-origin Worker; no CORS helpers needed.
 * Omit exclude_ids when the list is empty (first show of a word).
 */
export async function generateExercise(
  vocabItemId: string,
  exerciseType: ExerciseType,
  excludeIds?: readonly string[],
): Promise<GenerateExerciseResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return { ok: false, status: 401, error: 'unauthorized', detail: 'Không có phiên đăng nhập.' }
  }

  const excludeForRequest = excludeIdsForRequest(excludeIds)
  const payload: { vocab_item_id: string; exercise_type: ExerciseType; exclude_ids?: string[] } = {
    vocab_item_id: vocabItemId,
    exercise_type: exerciseType,
  }
  if (excludeForRequest.length > 0) payload.exclude_ids = excludeForRequest

  let response: Response
  try {
    response = await fetch('/api/generate-exercise', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'network_error',
      detail: 'Không kết nối được máy chủ. Thử lại sau.',
    }
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof record?.error === 'string' ? record.error : 'internal_error',
      detail: typeof record?.detail === 'string' ? record.detail : undefined,
    }
  }

  const exercise = record?.exercise
  if (!exercise || typeof exercise !== 'object') {
    return { ok: false, status: 500, error: 'invalid_response' }
  }

  const ex = exercise as Record<string, unknown>
  if (typeof ex.id !== 'string' || (ex.exercise_type !== 'fill_blank' && ex.exercise_type !== 'mcq')) {
    return { ok: false, status: 500, error: 'invalid_response' }
  }

  const content = parseContent(ex.exercise_type, ex.content)
  if (!content) {
    return { ok: false, status: 500, error: 'invalid_response' }
  }

  return {
    ok: true,
    exercise: {
      id: ex.id,
      exercise_type: ex.exercise_type,
      content,
    },
  }
}

export function messageForGenerateError(result: GenerateExerciseErr): string {
  if (result.status === 401 || result.error === 'unauthorized') {
    return 'Phiên đăng nhập hết hạn. Đăng nhập lại rồi thử tiếp.'
  }
  if (result.status === 429 || result.error === 'quota_exceeded') {
    return (
      result.detail ??
      'Hết lượt sinh bài tập mới hôm nay. Có thể vẫn luyện bằng câu có sẵn — bỏ qua từ này hoặc thử lại.'
    )
  }
  if (
    result.status === 503 ||
    result.error === 'generation_unavailable' ||
    result.error === 'server_misconfigured'
  ) {
    return (
      result.detail ??
      'Tính năng sinh bài tạm ngưng hoặc máy chủ chưa cấu hình xong. Bỏ qua từ này hoặc thử lại sau.'
    )
  }
  if (result.error === 'network_error') {
    return result.detail ?? 'Không kết nối được máy chủ. Thử lại sau.'
  }
  return result.detail ?? 'Không tải được bài tập. Thử lại hoặc bỏ qua từ này.'
}
