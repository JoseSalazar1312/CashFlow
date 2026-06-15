import { useState } from 'react'
import { supabase } from '../lib/supabaseConnector'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex h-screen items-center justify-center px-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <h1 className="mb-6 text-center text-2xl font-bold">Mis Deudas</h1>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-surface p-3 outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-surface p-3 outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent p-3 font-semibold text-bg disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-xs text-slate-500">
          Crea el usuario manualmente desde el dashboard de Supabase
          (Authentication → Users) ya que esta app es de uso personal.
        </p>
      </form>
    </div>
  )
}
