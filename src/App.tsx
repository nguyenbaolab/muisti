import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { DecksPage } from './pages/DecksPage'
import { CreateDeckPage } from './pages/CreateDeckPage'
import { EditDeckPage } from './pages/EditDeckPage'
import { DeckPreviewPage } from './pages/DeckPreviewPage'
import { DeckDetailPage } from './pages/DeckDetailPage'
import { LoginPage } from './pages/LoginPage'
import { ReviewPage } from './pages/ReviewPage'

function AuthRoutes() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/decks/new" element={<CreateDeckPage />} />
          <Route path="/decks/:id/edit" element={<EditDeckPage />} />
          <Route path="/decks/:id/preview" element={<DeckPreviewPage />} />
          <Route path="/decks/:id" element={<DeckDetailPage />} />
          <Route path="/decks" element={<DecksPage />} />
        </Route>
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/review/:deckId" element={<ReviewPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRoutes />
    </BrowserRouter>
  )
}
