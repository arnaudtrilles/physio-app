// Écran de verrouillage applicatif (D6). S'affiche au DÉMARRAGE quand le verrou
// est activé, APRÈS l'authentification Supabase et l'onboarding (cf. App.tsx).
//
// Garde-fous anti-enfermement (jamais bloquer un praticien légitime hors-ligne) :
//   • config illisible (IndexedDB indispo) → onUnlocked() (fail-open) ;
//   • aucune config pour ce compte (flag obsolète) → onConfigMissing() ;
//   • vérification du mot de passe 100 % LOCALE (aucun réseau) ;
//   • « Mot de passe oublié ? » → onForgot() (déconnexion = échappatoire).
import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, FocusEvent, FormEvent } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from '../design/tokens'
import { Button } from '../design/primitives'
import { IconLock } from '../design/icons'
import { verifyPassword, assertPlatformCredential, isPlatformAuthAvailable } from '../lib/appLock'
import type { LockConfig } from '../lib/appLock'
import { getLockConfig } from '../lib/appLockDB'

interface LockScreenProps {
  userId: string
  userEmail: string
  onUnlocked: () => void
  onForgot: () => void
  onConfigMissing: () => void
}

type Phase = 'loading' | 'biometric' | 'password'

const MAX_ATTEMPTS_BEFORE_DELAY = 5

export function LockScreen({ userId, userEmail, onUnlocked, onForgot, onConfigMissing }: LockScreenProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState(userEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const configRef = useRef<LockConfig | null>(null)
  const attemptsRef = useRef(0)

  // Tente une assertion biométrique ; bascule au mot de passe en cas d'échec.
  const tryBiometric = async () => {
    const credentialId = configRef.current?.credentialId
    if (!credentialId) {
      setPhase('password')
      return
    }
    setError(null)
    setBusy(true)
    const ok = await assertPlatformCredential(credentialId)
    setBusy(false)
    if (ok) onUnlocked()
    else setPhase('password')
  }

  // Chargement de la config + tentative biométrique automatique au montage.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      let config: LockConfig | undefined
      try {
        config = await getLockConfig(userId)
      } catch {
        // Lecture impossible (IndexedDB indispo, etc.) → fail-open, on n'enferme jamais.
        if (!cancelled) onUnlocked()
        return
      }
      if (cancelled) return
      if (!config) {
        // Flag activé mais aucun enrôlement pour CE compte (flag obsolète après
        // changement de compte, ou enrôlement perdu) → on déverrouille et on
        // laisse App nettoyer le flag.
        onConfigMissing()
        return
      }
      configRef.current = config
      if (config.credentialId && (await isPlatformAuthAvailable())) {
        if (cancelled) return
        setPhase('biometric')
        void tryBiometric()
      } else if (!cancelled) {
        setPhase('password')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Décompte du délai anti-brute-force.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || cooldown > 0) return
    const config = configRef.current
    if (!config) {
      onUnlocked()
      return
    }
    setError(null)
    if (!email.trim() || !password) {
      setError('Veuillez renseigner l\'e-mail et le mot de passe.')
      return
    }
    setBusy(true)
    const emailOk = email.trim().toLowerCase() === config.email.trim().toLowerCase()
    const pwdOk = await verifyPassword(password, config)
    setBusy(false)
    if (emailOk && pwdOk) {
      onUnlocked()
      return
    }
    attemptsRef.current += 1
    setPassword('')
    if (attemptsRef.current >= MAX_ATTEMPTS_BEFORE_DELAY) {
      const delay = Math.min(60, 10 * (attemptsRef.current - MAX_ATTEMPTS_BEFORE_DELAY + 1))
      setCooldown(delay)
      setError('Trop de tentatives. Patientez quelques instants.')
    } else {
      setError('E-mail ou mot de passe incorrect.')
    }
  }

  // ── Styles (alignés sur AuthScreen) ──
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
  const iconCircleStyle: CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: colors.surfaceMuted,
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  }
  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: typography.title,
    fontWeight: typography.extrabold,
    color: colors.text,
    letterSpacing: '-0.02em',
    textAlign: 'center',
  }
  const subtitleStyle: CSSProperties = {
    margin: `${spacing.xs}px 0 0`,
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  }
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
  const forgotStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontSize: typography.meta,
    color: colors.primary,
    alignSelf: 'center',
  }
  const focusOn = (e: FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = colors.primary
    e.currentTarget.style.boxShadow = `0 0 0 3px var(--info-bg)`
  }
  const focusOff = (e: FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = colors.borderSoft
    e.currentTarget.style.boxShadow = 'none'
  }

  if (phase === 'loading') {
    return (
      <div style={containerStyle}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (phase === 'biometric') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={iconCircleStyle}>
            <IconLock size={30} />
          </div>
          <div>
            <h1 style={titleStyle}>Application verrouillée</h1>
            <p style={subtitleStyle}>Déverrouillez avec Face ID ou Touch ID</p>
          </div>
          {busy && (
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 26, height: 26, margin: '0 auto' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={() => void tryBiometric()}>
              Réessayer
            </Button>
            <Button variant="secondary" fullWidth disabled={busy} onClick={() => setPhase('password')}>
              Utiliser le mot de passe
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconCircleStyle}>
          <IconLock size={30} />
        </div>
        <div>
          <h1 style={titleStyle}>Application verrouillée</h1>
          <p style={subtitleStyle}>Saisissez vos identifiants pour déverrouiller PhysioApp</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <div>
            <label style={labelStyle} htmlFor="lock-email">Adresse e-mail</label>
            <input
              id="lock-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.fr"
              autoComplete="email"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="lock-password">Mot de passe</label>
            <input
              id="lock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>
          {error && <div style={errorStyle}>{error}</div>}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Réessayez dans ${cooldown} s` : busy ? 'Vérification…' : 'Déverrouiller'}
          </Button>
          {configRef.current?.credentialId && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={busy}
              onClick={() => {
                setError(null)
                setPhase('biometric')
                void tryBiometric()
              }}
            >
              Réessayer avec Face ID / Touch ID
            </Button>
          )}
          <button type="button" onClick={onForgot} style={forgotStyle}>
            Mot de passe oublié&nbsp;? Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
