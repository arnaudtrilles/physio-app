import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (!supabase) { setError('Supabase non configuré.'); return }

    setStatus('loading')
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setStatus('error'); return }

    setStatus('done')
    setTimeout(() => { window.location.href = '/' }, 2500)
  }

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh', background: '#07090f', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    card: {
      background: 'linear-gradient(135deg, rgba(18,26,44,0.95), rgba(10,15,28,0.98))',
      border: '1px solid rgba(148,163,184,0.12)', borderRadius: 16,
      padding: '32px 28px', width: '100%', maxWidth: 380,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    },
    title: { color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 },
    sub: { color: '#475569', fontSize: '0.82rem', marginBottom: 28 },
    label: { display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 },
    input: {
      width: '100%', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.15)',
      borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: '0.9rem',
      outline: 'none', marginBottom: 16, boxSizing: 'border-box',
    },
    btn: {
      width: '100%', padding: '11px', borderRadius: 8, border: 'none',
      background: 'linear-gradient(135deg, #3b82f6, #818cf8)', color: '#fff',
      fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: 4,
    },
    error: { color: '#ef4444', fontSize: '0.78rem', marginBottom: 12 },
    success: { color: '#10b981', fontSize: '0.85rem', textAlign: 'center', marginTop: 8 },
  }

  if (status === 'done') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✓</div>
            <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 6 }}>Mot de passe mis à jour</div>
            <div style={{ color: '#475569', fontSize: '0.8rem' }}>Redirection vers l'application…</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>Nouveau mot de passe</div>
        <div style={s.sub}>Choisis un mot de passe sécurisé pour ton compte PhysioScan.</div>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Nouveau mot de passe</label>
          <input
            style={s.input} type="password" value={password} autoFocus
            onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum"
          />
          <label style={s.label}>Confirmer le mot de passe</label>
          <input
            style={s.input} type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)} placeholder="Répète le mot de passe"
          />
          {error && <div style={s.error}>{error}</div>}
          <button style={s.btn} type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Mise à jour…' : 'Confirmer'}
          </button>
        </form>
      </div>
    </div>
  )
}
