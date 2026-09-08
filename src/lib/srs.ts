export type AttemptGrade = 'easy' | 'good' | 'forgot'

const EASE_MIN = 1.3
const EASE_MAX = 2.8
const INTERVAL_MIN = 1
const INTERVAL_MAX = 180

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar date YYYY-MM-DD — not toISOString() (UTC can shift the day). */
export function todayLocalIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function addDaysToLocalIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function classifyAttempt(wrongCount: number): AttemptGrade {
  if (wrongCount <= 0) return 'easy'
  if (wrongCount === 1) return 'good'
  return 'forgot'
}

export function computeNextReview(params: {
  easeFactor: number
  intervalDays: number
  reviewCount: number
  wrongCount: number
}): { easeFactor: number; intervalDays: number; dueDate: string } {
  const grade = classifyAttempt(params.wrongCount)

  let easeFactor = params.easeFactor
  if (grade === 'easy') easeFactor += 0.15
  else if (grade === 'good') easeFactor -= 0.05
  else easeFactor -= 0.2
  easeFactor = clamp(easeFactor, EASE_MIN, EASE_MAX)

  let intervalDays: number
  if (params.reviewCount === 0) {
    if (grade === 'easy') intervalDays = 4
    else if (grade === 'good') intervalDays = 2
    else intervalDays = 1
  } else if (grade === 'forgot') {
    intervalDays = 1
  } else if (grade === 'easy') {
    intervalDays = Math.max(
      params.intervalDays + 1,
      Math.round(params.intervalDays * easeFactor),
    )
  } else {
    intervalDays = Math.max(
      params.intervalDays + 1,
      Math.round(params.intervalDays * easeFactor * 0.6),
    )
  }

  intervalDays = clamp(intervalDays, INTERVAL_MIN, INTERVAL_MAX)

  return {
    easeFactor,
    intervalDays,
    dueDate: addDaysToLocalIsoDate(todayLocalIsoDate(), intervalDays),
  }
}
