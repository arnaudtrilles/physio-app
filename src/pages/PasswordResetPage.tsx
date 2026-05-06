import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { colors, spacing, radius, typography, shadow } from '../design/tokens'
import { Button } from '../design/primitives'

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

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${colors.surfaceMuted} 0%, ${colors.base} 100%)`,
    padding: spacing.lg,
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 430,
    background: colors.surface,
    borderRadius: radius['2xl'],
    boxShadow: shadow.lg,
    padding: spacing['3xl'],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xl,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: typography.label,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.body,
    color: colors.text,
    background: colors.surfaceMuted,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.lg,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const errorStyle: React.CSSProperties = {
    background: colors.dangerSoft,
    color: colors.danger,
    border: `1px solid ${colors.dangerBg}`,
    borderRadius: radius.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: typography.label,
  }

  if (status === 'done') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: typography.hero, fontWeight: typography.extrabold, color: colors.primary, letterSpacing: '-0.03em' }}>
              PhysioApp
            </h1>
            <div style={{ marginTop: spacing.xl, color: colors.success, fontWeight: typography.semibold, fontSize: typography.body }}>
              ✓ Mot de passe mis à jour
            </div>
            <div style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.label }}>
              Redirection vers l'application…
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: typography.hero, fontWeight: typography.extrabold, color: colors.primary, letterSpacing: '-0.03em' }}>
            PhysioApp
          </h1>
          <p style={{ margin: 0, marginTop: spacing.xs, fontSize: typography.body, color: colors.textMuted }}>
            Choisis un nouveau mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <div>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input
              type="password" value={password} autoFocus
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}22` }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.borderSoft; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répète le mot de passe"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}22` }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.borderSoft; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {error && <div style={errorStyle}>{error}</div>}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={status === 'loading'}>
            {status === 'loading' ? 'Mise à jour…' : 'Confirmer le mot de passe'}
          </Button>
        </form>
      </div>
    </div>
  )
}
