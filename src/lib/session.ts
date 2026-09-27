import type { ReviewQueueItem } from '../types/database'

export type SessionCard = ReviewQueueItem & {
  wrongCount: number // frozen for SRS at first correct; do not change after persisted
  totalWrong: number // total wrongs this session (debt tier 3/2/1)
  repeatDebt: number // remaining re-presents this session (memory only)
  persisted: boolean // SRS already written — block double persist
}

export function computeReinsertGap(initialSize: number): number {
  const raw = Math.round(0.25 * initialSize)
  return Math.min(8, Math.max(3, raw))
}

/** rest = queue without front card; insert at index `gap` (short rest → end). */
export function reinsertAtGap(rest: SessionCard[], card: SessionCard, gap: number): SessionCard[] {
  return [...rest.slice(0, gap), card, ...rest.slice(gap)]
}

/** Apply one wrong answer: bump totalWrong, debt 3/2/1, wrongCount only if not yet persisted. */
export function applyWrong(card: SessionCard): SessionCard {
  const nextTotalWrong = card.totalWrong + 1
  const debtAdd = nextTotalWrong === 1 ? 3 : nextTotalWrong === 2 ? 2 : 1
  return {
    ...card,
    totalWrong: nextTotalWrong,
    repeatDebt: card.repeatDebt + debtAdd,
    wrongCount: card.persisted ? card.wrongCount : card.wrongCount + 1,
  }
}

/**
 * Pure queue step after feedback (correct or wrong).
 * Does not present UI or touch the DB — caller handles presentCard / done side effects.
 */
export function advanceSession(
  queue: SessionCard[],
  completedCards: SessionCard[],
  wasCorrect: boolean,
  initialSize: number,
): { queue: SessionCard[]; completedCards: SessionCard[]; done: boolean } {
  const current = queue[0]
  if (!current) {
    return { queue, completedCards, done: queue.length === 0 }
  }

  if (wasCorrect && current.repeatDebt === 0) {
    const nextCompleted = [...completedCards, current]
    const nextQueue = queue.slice(1)
    return {
      queue: nextQueue,
      completedCards: nextCompleted,
      done: nextQueue.length === 0,
    }
  }

  const rest = queue.slice(1)
  const updated = { ...current, repeatDebt: current.repeatDebt - 1 }
  const gap = computeReinsertGap(initialSize)
  return {
    queue: reinsertAtGap(rest, updated, gap),
    completedCards,
    done: false,
  }
}
