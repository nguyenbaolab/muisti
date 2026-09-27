/**
 * Muisti Worker — POST /api/generate-exercise (Level 2).
 * Static SPA via env.ASSETS; secrets only from Worker env (never VITE_).
 */

export interface Env {
  ASSETS: Fetcher
  ANTHROPIC_API_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  /** Runtime URL — NOT VITE_SUPABASE_URL (Vite-only). */
  SUPABASE_URL: string
  /** Runtime anon key — NOT VITE_SUPABASE_ANON_KEY. */
  SUPABASE_ANON_KEY: string
}

type ExerciseType = 'fill_blank' | 'mcq'

type FillBlankContent = { prompt: string; answer: string }
type McqContent = { prompt: string; options: string[]; correct: string }
type ExerciseContent = FillBlankContent | McqContent

type GeneratedRow = {
  id: string
  exercise_type: ExerciseType
  content: ExerciseContent
  times_shown: number
  cooldown_until: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed)
  return fenced ? fenced[1].trim() : trimmed
}

function isFillBlank(value: unknown): value is FillBlankContent {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return typeof o.prompt === 'string' && typeof o.answer === 'string'
}

function isMcq(value: unknown): value is McqContent {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  if (typeof o.prompt !== 'string' || typeof o.correct !== 'string') return false
  if (!Array.isArray(o.options) || o.options.length !== 4) return false
  if (!o.options.every((x) => typeof x === 'string')) return false
  return o.options.includes(o.correct)
}

function parseExerciseContent(exerciseType: ExerciseType, raw: string): ExerciseContent | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripMarkdownFence(raw))
  } catch {
    return null
  }
  if (exerciseType === 'fill_blank') return isFillBlank(parsed) ? parsed : null
  return isMcq(parsed) ? parsed : null
}

function looksLikeBillingIssue(bodyText: string): boolean {
  const t = bodyText.toLowerCase()
  return (
    t.includes('credit') ||
    t.includes('billing') ||
    t.includes('payment') ||
    t.includes('insufficient') ||
    t.includes('quota') ||
    t.includes('plan')
  )
}

async function verifyUser(
  env: Env,
  accessToken: string,
): Promise<{ id: string } | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { id?: unknown }
  if (typeof data.id !== 'string' || !data.id) return null
  return { id: data.id }
}

function supabaseHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
}

async function findPoolExercise(
  env: Env,
  vocabItemId: string,
  exerciseType: ExerciseType,
  today: string,
): Promise<GeneratedRow | null> {
  const params = new URLSearchParams()
  params.set('select', 'id,exercise_type,content,times_shown,cooldown_until')
  params.set('vocab_item_id', `eq.${vocabItemId}`)
  params.set('exercise_type', `eq.${exerciseType}`)
  params.set('or', `(cooldown_until.is.null,cooldown_until.lte.${today})`)
  params.set('order', 'times_shown.asc')
  params.set('limit', '1')

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/generated_exercises?${params}`, {
    method: 'GET',
    headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
  })
  if (!res.ok) {
    console.error('pool query failed', res.status)
    throw new Error('pool_query_failed')
  }
  const rows = (await res.json()) as GeneratedRow[]
  return rows[0] ?? null
}

async function bumpPoolExercise(
  env: Env,
  row: GeneratedRow,
  today: string,
): Promise<GeneratedRow> {
  const newTimesShown = row.times_shown + 1
  const newCooldown = newTimesShown >= 5 ? addDaysIso(today, 10) : null

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/generated_exercises?id=eq.${row.id}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({
        times_shown: newTimesShown,
        cooldown_until: newCooldown,
      }),
    },
  )
  if (!res.ok) {
    console.error('pool update failed', res.status)
    throw new Error('pool_update_failed')
  }
  return row
}

async function ensureQuotaRow(env: Env, userId: string, today: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/exercise_quota_usage`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      usage_date: today,
      generations_used: 0,
    }),
  })
  // 201 created or 200/204 ignore-duplicates
  if (!res.ok && res.status !== 409) {
    console.error('quota upsert failed', res.status)
    throw new Error('quota_upsert_failed')
  }
}

async function readQuota(
  env: Env,
  userId: string,
  today: string,
): Promise<{ used: number; limit: number }> {
  const usageParams = new URLSearchParams()
  usageParams.set('select', 'generations_used')
  usageParams.set('user_id', `eq.${userId}`)
  usageParams.set('usage_date', `eq.${today}`)
  usageParams.set('limit', '1')

  const usageRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/exercise_quota_usage?${usageParams}`,
    { method: 'GET', headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
  )
  if (!usageRes.ok) {
    console.error('quota read failed', usageRes.status)
    throw new Error('quota_read_failed')
  }
  const usageRows = (await usageRes.json()) as { generations_used: number }[]
  const used = usageRows[0]?.generations_used ?? 0

  const profileParams = new URLSearchParams()
  profileParams.set('select', 'daily_exercise_quota')
  profileParams.set('id', `eq.${userId}`)
  profileParams.set('limit', '1')

  const profileRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?${profileParams}`,
    { method: 'GET', headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
  )
  if (!profileRes.ok) {
    console.error('profile quota read failed', profileRes.status)
    throw new Error('profile_quota_read_failed')
  }
  const profiles = (await profileRes.json()) as { daily_exercise_quota: number }[]
  const limit = profiles[0]?.daily_exercise_quota ?? 10

  return { used, limit }
}

async function incrementQuota(env: Env, userId: string, today: string, used: number): Promise<void> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/exercise_quota_usage?user_id=eq.${userId}&usage_date=eq.${today}`,
    {
      method: 'PATCH',
      headers: {
        ...supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ generations_used: used + 1 }),
    },
  )
  if (!res.ok) {
    console.error('quota increment failed', res.status)
    throw new Error('quota_increment_failed')
  }
}

async function loadOwnedVocab(
  env: Env,
  userId: string,
  vocabItemId: string,
): Promise<{ finnish_word: string; translation: string } | null> {
  const params = new URLSearchParams()
  params.set('select', 'finnish_word,translation,decks!inner(owner_id)')
  params.set('id', `eq.${vocabItemId}`)
  params.set('decks.owner_id', `eq.${userId}`)
  params.set('limit', '1')

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/vocab_items?${params}`, {
    method: 'GET',
    headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
  })
  if (!res.ok) {
    console.error('vocab load failed', res.status)
    throw new Error('vocab_load_failed')
  }
  const rows = (await res.json()) as { finnish_word: string; translation: string }[]
  return rows[0] ?? null
}

function buildClaudeUserPrompt(
  exerciseType: ExerciseType,
  finnishWord: string,
  translation: string,
): string {
  if (exerciseType === 'fill_blank') {
    return (
      `Create one Finnish fill-in-the-blank exercise for the word "${finnishWord}" ` +
      `(meaning: "${translation}"). Return ONLY JSON: ` +
      `{"prompt":"Finnish sentence with ___ for the blank","answer":"the exact Finnish word"}.`
    )
  }
  return (
    `Create one Finnish multiple-choice exercise for the word "${finnishWord}" ` +
    `(meaning: "${translation}"). Return ONLY JSON: ` +
    `{"prompt":"question or incomplete sentence","options":["a","b","c","d"],"correct":"one of the four options exactly"}.`
  )
}

type ClaudeOutcome =
  | { kind: 'ok'; content: ExerciseContent }
  | { kind: 'unavailable' }
  | { kind: 'failed' }

async function callClaude(
  env: Env,
  exerciseType: ExerciseType,
  finnishWord: string,
  translation: string,
): Promise<ClaudeOutcome> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system:
        'You are a Finnish language tutor. Reply with a single JSON object only. ' +
        'No markdown, no code fences, no explanation outside JSON.',
      messages: [
        {
          role: 'user',
          content: buildClaudeUserPrompt(exerciseType, finnishWord, translation),
        },
      ],
    }),
  })

  if (res.status === 200) {
    const payload = (await res.json()) as {
      content?: { type: string; text?: string }[]
    }
    const text = payload.content?.find((c) => c.type === 'text')?.text
    if (!text) {
      console.error('claude 200 missing text block')
      return { kind: 'failed' }
    }
    const content = parseExerciseContent(exerciseType, text)
    if (!content) {
      console.error('claude 200 JSON parse/validate failed')
      return { kind: 'failed' }
    }
    return { kind: 'ok', content }
  }

  if (res.status === 429) {
    console.error('claude rate limited', res.status)
    return { kind: 'unavailable' }
  }

  if (res.status === 400 || res.status === 403) {
    let bodyText = ''
    try {
      bodyText = await res.text()
    } catch {
      bodyText = ''
    }
    if (looksLikeBillingIssue(bodyText)) {
      console.error('claude billing/credit issue', res.status)
      return { kind: 'unavailable' }
    }
    console.error('claude client error', res.status)
    return { kind: 'failed' }
  }

  console.error('claude unexpected status', res.status)
  return { kind: 'failed' }
}

async function insertExercise(
  env: Env,
  vocabItemId: string,
  exerciseType: ExerciseType,
  content: ExerciseContent,
): Promise<{ id: string } | null> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/generated_exercises`, {
    method: 'POST',
    headers: supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({
      vocab_item_id: vocabItemId,
      exercise_type: exerciseType,
      content,
      times_shown: 1,
      cooldown_until: null,
    }),
  })
  if (!res.ok) {
    console.error('exercise insert failed', res.status)
    return null
  }
  const rows = (await res.json()) as { id: string }[]
  const id = rows[0]?.id
  return id ? { id } : null
}

async function handleGenerateExercise(request: Request, env: Env): Promise<Response> {
  const accessToken = bearerToken(request)
  if (!accessToken) {
    return json({ error: 'unauthorized' }, 401)
  }

  let user: { id: string } | null
  try {
    user = await verifyUser(env, accessToken)
  } catch {
    console.error('auth verify network failure')
    return json({ error: 'internal_error' }, 500)
  }
  if (!user) {
    return json({ error: 'unauthorized' }, 401)
  }

  if (!env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set')
    return json({ error: 'server_misconfigured' }, 503)
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    return json({ error: 'server_misconfigured' }, 503)
  }
  if (!env.SUPABASE_URL) {
    console.error('SUPABASE_URL is not set')
    return json({ error: 'server_misconfigured' }, 503)
  }
  if (!env.SUPABASE_ANON_KEY) {
    console.error('SUPABASE_ANON_KEY is not set')
    return json({ error: 'server_misconfigured' }, 503)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid_request' }, 400)
  }
  const { vocab_item_id: vocabItemId, exercise_type: exerciseType } = body as {
    vocab_item_id?: unknown
    exercise_type?: unknown
  }
  if (typeof vocabItemId !== 'string' || !UUID_RE.test(vocabItemId)) {
    return json({ error: 'invalid_request' }, 400)
  }
  if (exerciseType !== 'fill_blank' && exerciseType !== 'mcq') {
    return json({ error: 'invalid_request' }, 400)
  }

  const today = todayIsoDate()

  try {
    const pooled = await findPoolExercise(env, vocabItemId, exerciseType, today)
    if (pooled) {
      await bumpPoolExercise(env, pooled, today)
      return json(
        {
          exercise: {
            id: pooled.id,
            exercise_type: pooled.exercise_type,
            content: pooled.content,
          },
        },
        200,
      )
    }

    await ensureQuotaRow(env, user.id, today)
    const { used, limit } = await readQuota(env, user.id, today)
    if (used >= limit) {
      return json(
        {
          error: 'quota_exceeded',
          detail: 'Đã hết lượt sinh bài tập hôm nay, chưa có câu nào sẵn sàng cho từ này.',
        },
        429,
      )
    }

    const vocab = await loadOwnedVocab(env, user.id, vocabItemId)
    if (!vocab) {
      return json({ error: 'vocab_item_not_found' }, 404)
    }

    const claude = await callClaude(env, exerciseType, vocab.finnish_word, vocab.translation)
    if (claude.kind === 'unavailable') {
      return json(
        {
          error: 'generation_unavailable',
          detail:
            'Tính năng sinh bài tập mới tạm ngưng. Bạn vẫn luyện được các từ đã có bài tập.',
        },
        503,
      )
    }
    if (claude.kind === 'failed') {
      return json({ error: 'generation_failed' }, 502)
    }

    const inserted = await insertExercise(env, vocabItemId, exerciseType, claude.content)
    if (!inserted) {
      return json({ error: 'internal_error' }, 500)
    }

    await incrementQuota(env, user.id, today, used)

    return json(
      {
        exercise: {
          id: inserted.id,
          exercise_type: exerciseType,
          content: claude.content,
        },
      },
      200,
    )
  } catch {
    console.error('generate-exercise unexpected failure')
    return json({ error: 'internal_error' }, 500)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/generate-exercise' && request.method === 'POST') {
        return handleGenerateExercise(request, env)
      }
      return json({ error: 'not_found' }, 404)
    }

    return env.ASSETS.fetch(request)
  },
}
