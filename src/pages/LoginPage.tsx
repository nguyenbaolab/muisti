import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { supabase } from '../lib/supabase'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email hoặc mật khẩu không đúng.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Email chưa được xác nhận.'
  }
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.'
  }
  return 'Không đăng nhập được. Thử lại sau.'
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error(signInError)
        setError(mapAuthError(signInError.message))
      }
    } catch (caught) {
      console.error(caught)
      setError('Không đăng nhập được. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm text-left">
        <p className="text-sm font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Muisti
        </p>
        <h1>Đăng nhập</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted-dark)]">
          Học từ vựng tiếng Phần Lan
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={error ?? undefined}
          />
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </main>
  )
}
