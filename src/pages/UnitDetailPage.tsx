import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Exercise, Unit, VocabItem } from '../types/database'

function isUnitNotFoundError(code: string | undefined) {
  return code === 'PGRST116' || code === '22P02'
}

export function UnitDetailPage() {
  const { id: unitId } = useParams<{ id: string }>()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!unitId) {
      setUnit(null)
      setVocab([])
      setExercises([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)

    void Promise.all([
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
    ]).then(([unitResult, vocabResult, exercisesResult]) => {
      if (cancelled) return

      if (vocabResult.error) {
        setError(vocabResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
      } else if (exercisesResult.error) {
        setError(exercisesResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
      } else if (unitResult.error && !isUnitNotFoundError(unitResult.error.code)) {
        setError(unitResult.error.message)
        setUnit(null)
        setVocab([])
        setExercises([])
      } else {
        setError(null)
        setUnit((unitResult.data ?? null) as Unit | null)
        setVocab((vocabResult.data ?? []) as VocabItem[])
        setExercises((exercisesResult.data ?? []) as Exercise[])
      }

      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [unitId])

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
            {vocab.map((item) => (
              <li key={item.id}>
                <strong>{item.finnish_word}</strong> — {item.translation}
                {item.part_of_speech ? <div>{item.part_of_speech}</div> : null}
                {item.example_sentence ? <div>{item.example_sentence}</div> : null}
                {item.notes ? <div>{item.notes}</div> : null}
              </li>
            ))}
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
