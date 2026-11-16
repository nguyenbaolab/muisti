import type { ExerciseType } from '../types/database'
import { computeReinsertGap } from './session'

/**
 * One Level 2 word in the practice queue.
 * repeatDebt matches Level 1 (applyWrong + advanceSession).
 * pendingTypes[0] is the next show; after Next, pendingTypes.length === repeatDebt + 1
 * for a card that was just reinserted. The first show uses firstType while pendingTypes is empty.
 */
export type PracticeCard = {
  vocabItemId: string
  finnishWord: string
  translation: string
  firstType: ExerciseType
  totalWrong: number
  repeatDebt: number
  pendingTypes: ExerciseType[]
}

export function pickFirstType(): ExerciseType {
  return Math.random() < 0.5 ? 'fill_blank' : 'mcq'
}

export function createPracticeCard(
  vocabItemId: string,
  finnishWord: string,
  translation: string,
): PracticeCard {
  return {
    vocabItemId,
    finnishWord,
    translation,
    firstType: pickFirstType(),
    totalWrong: 0,
    repeatDebt: 0,
    pendingTypes: [],
  }
}

export function currentExerciseType(card: PracticeCard): ExerciseType {
  return card.pendingTypes[0] ?? card.firstType
}

function randomExerciseType(): ExerciseType {
  return Math.random() < 0.5 ? 'fill_blank' : 'mcq'
}

/** Batch length equals the debt just added. At least one fill_blank; 3rd+ wrong is only fill_blank. */
function batchForDebtAdd(debtAdd: number): ExerciseType[] {
  if (debtAdd <= 1) return ['fill_blank']
  const batch: ExerciseType[] = []
  for (let i = 0; i < debtAdd; i++) batch.push(randomExerciseType())
  const blankAt = Math.floor(Math.random() * batch.length)
  batch[blankAt] = 'fill_blank'
  return batch
}

/**
 * Grade the front card. Drops the type that was just shown, then on a wrong answer
 * adds Level 1 debt and appends a fresh type batch. Earlier pending types stay as stored.
 */
export function gradePracticeCard(card: PracticeCard, wasCorrect: boolean): PracticeCard {
  const pendingTypes = card.pendingTypes.slice(1)
  if (wasCorrect) return { ...card, pendingTypes }

  const totalWrong = card.totalWrong + 1
  const debtAdd = totalWrong === 1 ? 3 : totalWrong === 2 ? 2 : 1
  return {
    ...card,
    totalWrong,
    repeatDebt: card.repeatDebt + debtAdd,
    pendingTypes: [...pendingTypes, ...batchForDebtAdd(debtAdd)],
  }
}

/** rest = queue without the front card; insert at index `gap` (short rest → end). */
export function reinsertPracticeCard<T>(rest: T[], card: T, gap: number): T[] {
  return [...rest.slice(0, gap), card, ...rest.slice(gap)]
}

/**
 * Queue step after feedback. Same graduate / decrement / gap rules as advanceSession.
 * Gap comes from Level 1 computeReinsertGap; this file does not edit session.ts.
 */
export function advancePracticeSession(
  queue: PracticeCard[],
  completedCards: PracticeCard[],
  wasCorrect: boolean,
  initialSize: number,
): { queue: PracticeCard[]; completedCards: PracticeCard[]; done: boolean } {
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
    queue: reinsertPracticeCard(rest, updated, gap),
    completedCards,
    done: false,
  }
}
