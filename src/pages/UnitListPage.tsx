import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Unit } from '../types/database'

export function UnitListPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void supabase
      .from('units')
      .select('*')
      .order('book_code', { ascending: true })
      .order('unit_number', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setUnits([])
        } else {
          setError(null)
          setUnits((data ?? []) as Unit[])
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p>Đang tải...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (units.length === 0) {
    return <p>Chưa có unit nào.</p>
  }

  return (
    <main>
      <h1>Danh sách unit</h1>
      <ul>
        {units.map((unit) => (
          <li key={unit.id}>
            <strong>
              <Link to={`/units/${unit.id}`}>{unit.title}</Link>
            </strong>
            {unit.description ? <p>{unit.description}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  )
}
