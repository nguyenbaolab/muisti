import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Exercise, Unit, UserVocabProgress, VocabItem } from '../types/database'

function isUnitNotFoundError(code: string | undefined) {
  return code === 'PGRST116' || code === '22P02'
}

function isUniqueConflict(code: string | undefined, message: string) {
  return code === '23505' || /duplicate key|unique/i.test(message)
}

export function UnitDetailPage() {
  const { id: unitId } = useParams<{ id: string }>()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [markedVocabIds, setMarkedVocabIds] = useState<Set<string>>(() => new Set())
  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set())
  const [markErrors, setMarkErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!unitId) {
      setUnit(null)
      setVocab([])
      setExercises([])
      setUserId(null)
      setMarkedVocabIds(new Set())
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return

      const currentUserId = user?.id ?? null
      setUserId(currentUserId)

      const progressQuery = currentUserId
        ? supabase
            .from('user_vocab_progress')
            .select('vocab_item_id')
            .eq('user_id', currentUserId)
        : Promise.resolve({
            data: [] as Pick<UserVocabProgress, 'vocab_item_id'>[],
            error: null,
          })

      const [unitResult, vocabResult, exercisesResult, progressResult] = await Promise.all([
        supabase.from('units').select('*').eq('id', unitId).single(),
        supabase
          .from('vocab_items')
          .select('*')
          .eq('unit_id', unitId)
          .order('created_at', { ascending: true }),
        supabase
          .from('exercises')
          .select('*')
          .eq('unit_id', unitId)
          .order('created_at', { ascending: true }),
        progressQuery,
      ])

      if (cancelled) return

      if (vocabResult.error) {
        setError(vocabResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
        setMarkedVocabIds(new Set())
      } else if (exercisesResult.error) {
        setError(exercisesResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
        setMarkedVocabIds(new Set())
      } else if (progressResult.error) {
        setError(progressResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
        setMarkedVocabIds(new Set())
      } else if (unitResult.error && !isUnitNotFoundError(unitResult.error.code)) {
        setError(unitResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
        setMarkedVocabIds(new Set())
      } else {
        setError(null)
        setUnit((unitResult.data ?? null) as Unit | null)
        setVocab((vocabResult.data ?? []) as VocabItem[])
        setExercises((exercisesResult.data ?? []) as Exercise[])
        setMarkedVocabIds(
          new Set(
            ((progressResult.data ?? []) as Pick<UserVocabProgress, 'vocab_item_id'>[]).map(
              (row) => row.vocab_item_id,
            ),
          ),
        )
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [unitId])

  async function handleMark(itemId: string) {
    if (!userId || markedVocabIds.has(itemId) || markingIds.has(itemId)) {
      return
    }

    setMarkingIds((prev) => new Set(prev).add(itemId))
    setMarkErrors((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })

    const { error: insertError } = await supabase.from('user_vocab_progress').insert({
      user_id: userId,
      vocab_item_id: itemId,
    })

    if (insertError && !isUniqueConflict(insertError.code, insertError.message)) {
      setMarkErrors((prev) => ({ ...prev, [itemId]: insertError.message }))
    } else {
      setMarkedVocabIds((prev) => new Set(prev).add(itemId))
    }

    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  async function handleUnmark(itemId: string) {
    if (!userId || !markedVocabIds.has(itemId) || markingIds.has(itemId)) {
      return
    }

    setMarkingIds((prev) => new Set(prev).add(itemId))
    setMarkErrors((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })

    const { error: deleteError } = await supabase
      .from('user_vocab_progress')
      .delete()
      .eq('user_id', userId)
      .eq('vocab_item_id', itemId)

    if (deleteError) {
      setMarkErrors((prev) => ({ ...prev, [itemId]: deleteError.message }))
    } else {
      setMarkedVocabIds((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }

    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
  }

  if (loading) {
    return <p>Đang tải...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (!unit) {
    return (
      <main>
        <p>Không tìm thấy unit.</p>
        <p>
          <Link to="/units">← Danh sách unit</Link>
        </p>
      </main>
    )
  }

  return (
    <main>
      <p>
        <Link to="/units">← Danh sách unit</Link>
      </p>
      <h1>{unit.title}</h1>
      {unit.description ? <p>{unit.description}</p> : null}

      <section>
        <h2>Từ vựng</h2>
        {vocab.length === 0 ? (
          <p>Chưa có từ vựng.</p>
        ) : (
          <ul>
            {vocab.map((item) => {
              const marked = markedVocabIds.has(item.id)
              const marking = markingIds.has(item.id)
              const markError = markErrors[item.id]

              return (
                <li key={item.id}>
                  <strong>{item.finnish_word}</strong> — {item.translation}
                  {item.part_of_speech ? <div>{item.part_of_speech}</div> : null}
                  {item.example_sentence ? <div>{item.example_sentence}</div> : null}
                  {item.notes ? <div>{item.notes}</div> : null}
                  <div>
                    <button
                      type="button"
                      disabled={marking || !userId}
                      onClick={() =>
                        void (marked ? handleUnmark(item.id) : handleMark(item.id))
                      }
                    >
                      {marking && marked
                        ? 'Đang bỏ đánh dấu…'
                        : marking
                          ? 'Đang đánh dấu…'
                          : marked
                            ? 'Đã đánh dấu ✓ (bấm để bỏ)'
                            : 'Đánh dấu'}
                    </button>
                    {markError ? <p>{markError}</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Bài tập</h2>
        {exercises.length === 0 ? (
          <p>Chưa có bài tập.</p>
        ) : (
          <ul>
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <strong>{exercise.type}</strong>
                <p>{exercise.prompt}</p>
                {exercise.scene_description ? <p>{exercise.scene_description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
