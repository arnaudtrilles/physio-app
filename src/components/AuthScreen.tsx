import { useState, type CSSProperties, type FormEvent } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from '../design/tokens'
import { Button } from '../design/primitives'
import { useAuth } from '../hooks/useAuth'

type Tab = 'login' | 'signup'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSignupSuccess(false)
  }

  const switchTab = (next: Tab) => {
    resetForm()
    setTab(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    if (tab === 'signup') {
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.')
        return
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères.')
        return
      }
    }

    setLoading(true)

    const { error: authError } =
      tab === 'login'
        ? await signIn(email, password)
        : await signUp(email, password)

    setLoading(false)

    if (authError) {
      setError(friendlyError(authError.message))
      return
    }

    if (tab === 'signup') {
      setSignupSuccess(true)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────

  const containerStyle: CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${colors.surfaceMuted} 0%, ${colors.base} 100%)`,
    padding: spacing.lg,
  }

  const cardStyle: CSSProperties = {
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

  const logoStyle: CSSProperties = {
    textAlign: 'center',
    marginBottom: spacing.sm,
  }

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: typography.hero,
    fontWeight: typography.extrabold,
    color: colors.primary,
    letterSpacing: '-0.03em',
  }

  const subtitleStyle: CSSProperties = {
    margin: 0,
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: colors.textMuted,
  }

  const tabBarStyle: CSSProperties = {
    display: 'flex',
    background: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: 3,
    gap: 3,
  }

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: `${spacing.sm}px 0`,
    border: 'none',
    borderRadius: radius.md,
    background: active ? colors.surface : 'transparent',
    color: active ? colors.primary : colors.textMuted,
    fontSize: typography.label,
    fontWeight: active ? typography.bold : typography.medium,
    cursor: 'pointer',
    transition: `all ${motion.fast}`,
    boxShadow: active ? shadow.xs : 'none',
  })

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: typography.label,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.body,
    color: colors.text,
    background: colors.surfaceMuted,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.lg,
    outline: 'none',
    transition: `border-color ${motion.fast}, box-shadow ${motion.fast}`,
    boxSizing: 'border-box',
  }

  const errorStyle: CSSProperties = {
    background: colors.dangerSoft,
    color: colors.danger,
    border: `1px solid ${colors.dangerBg}`,
    borderRadius: radius.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: typography.label,
    fontWeight: typography.medium,
  }

  const successStyle: CSSProperties = {
    background: colors.successSoft,
    color: colors.success,
    border: `1px solid ${colors.successBg}`,
    borderRadius: radius.md,
    padding: `${spacing.md}px`,
    fontSize: typography.body,
    fontWeight: typography.medium,
    textAlign: 'center',
  }

  // ── Render ──────────────────────────────────────────────────────

  if (signupSuccess) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>
            <h1 style={titleStyle}>PhysioApp</h1>
          </div>
          <div style={successStyle}>
            Un e-mail de confirmation a été envoyé à <strong>{email}</strong>.
            Veuillez vérifier votre boîte de réception.
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => switchTab('login')}
          >
            Retour à la connexion
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo / Title */}
        <div style={logoStyle}>
          <h1 style={titleStyle}>PhysioApp</h1>
          <p style={subtitleStyle}>
            {tab === 'login'
              ? 'Connectez-vous à votre compte'
              : 'Créez votre compte'}
          </p>
        </div>

        {/* Tabs */}
        <div style={tabBarStyle}>
          <button style={tabStyle(tab === 'login')} onClick={() => switchTab('login')}>
            Connexion
          </button>
          <button style={tabStyle(tab === 'signup')} onClick={() => switchTab('signup')}>
            Inscription
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}
        >
          <div>
            <label style={labelStyle}>Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nom@exemple.fr"
              autoComplete="email"
              style={inputStyle}
              onFocus={e => {
                e.currentTarget.style.borderColor = colors.primary
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}22`
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = colors.borderSoft
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle}
              onFocus={e => {
                e.currentTarget.style.borderColor = colors.primary
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}22`
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = colors.borderSoft
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={e => {
                  e.currentTarget.style.borderColor = colors.primary
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary}22`
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = colors.borderSoft
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
          >
            {loading
              ? 'Chargement...'
              : tab === 'login'
                ? 'Se connecter'
                : 'Créer un compte'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials'))
    return 'Adresse e-mail ou mot de passe incorrect.'
  if (lower.includes('email not confirmed'))
    return 'Veuillez confirmer votre adresse e-mail avant de vous connecter.'
  if (lower.includes('user already registered'))
    return 'Cette adresse e-mail est déjà utilisée.'
  if (lower.includes('signup is not allowed') || lower.includes('signups not allowed'))
    return "Les inscriptions ne sont pas autorisées pour le moment."
  if (lower.includes('rate limit') || lower.includes('too many requests'))
    return 'Trop de tentatives. Veuillez réessayer dans quelques instants.'
  if (lower.includes('password') && lower.includes('at least'))
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  return message
}
