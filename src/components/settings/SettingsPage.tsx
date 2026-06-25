import { useState } from 'react'
import type { Theme } from '../../hooks/useTheme'
import type { SyncStatus } from '../../hooks/useSync'
import type { DocReconcileResult, LostDocRef } from '../../lib/documentStorage'

type Language = 'fr' | 'de' | 'en'

type SettingsPageProps = {
  theme: Theme
  onChangeTheme: (t: Theme) => void
  language: Language
  onChangeLanguage: (l: Language) => void
  notificationsEnabled: boolean
  onToggleNotifications: (enabled: boolean) => void
  syncStatus: SyncStatus
  isOnline: boolean
  /** Nombre de documents présents en local mais pas encore confirmés dans le cloud. */
  cloudDocsPending: number
  /** Lance la réconciliation blob↔métadonnée (ré-upload des blobs manquants). */
  onRepairDocuments: () => Promise<DocReconcileResult>
  /** Supprime du dossier les documents définitivement perdus identifiés par la réconciliation. */
  onDeleteLostDocuments: (refs: LostDocRef[]) => void
  onBack: () => void
  onProfile: () => void
  onPricing: () => void
  onRelaunchTutorial: () => void
  onSignOut: () => void
  analyticsEnabled: boolean
  onToggleAnalytics: (enabled: boolean) => void
  /** Verrou applicatif (D6) activé pour ce compte. */
  appLockEnabled: boolean
  /** Active le verrou : enrôle mot de passe (+ biométrie si dispo). */
  onEnableAppLock: (password: string) => Promise<{ biometricEnrolled: boolean }>
  /** Désactive le verrou : efface l'enrôlement local. */
  onDisableAppLock: () => Promise<void>
}

const SYNC_STATUS_CONFIG: Record<SyncStatus, { color: string; bg: string; label: string }> = {
  idle: { color: 'var(--text-muted)', bg: 'var(--secondary)', label: 'En attente' },
  syncing: { color: '#f59e0b', bg: 'color-mix(in srgb, #f59e0b 10%, transparent)', label: 'Synchronisation...' },
  done: { color: '#22c55e', bg: 'color-mix(in srgb, #22c55e 10%, transparent)', label: 'Synchronisé' },
  error: { color: '#dc2626', bg: 'color-mix(in srgb, #dc2626 10%, transparent)', label: 'Erreur de sync' },
}

const THEME_OPTIONS: Array<{ id: Theme; label: string; desc: string; swatch: [string, string] }> = [
  { id: 'soft', label: 'Soft', desc: 'Vert & beige', swatch: ['#2D5A4B', '#F0EBE1'] },
  { id: 'medical', label: 'Médical', desc: 'Bleu & blanc', swatch: ['#1e3a8a', '#f8fafc'] },
]

const LANGUAGE_OPTIONS: Array<{ id: Language; flag: string; label: string }> = [
  { id: 'fr', flag: '🇫🇷', label: 'Français' },
  { id: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { id: 'en', flag: '🇬🇧', label: 'English' },
]


export function SettingsPage({
  theme, onChangeTheme,
  language, onChangeLanguage,
  notificationsEnabled, onToggleNotifications,
  syncStatus, isOnline,
  cloudDocsPending, onRepairDocuments, onDeleteLostDocuments,
  onBack, onProfile, onPricing, onRelaunchTutorial, onSignOut,
  analyticsEnabled, onToggleAnalytics,
  appLockEnabled, onEnableAppLock, onDisableAppLock,
}: SettingsPageProps) {
  const syncConfig = SYNC_STATUS_CONFIG[syncStatus]

  // ── Verrou de l'application (D6) ──
  const [lockEnrolling, setLockEnrolling] = useState(false)
  const [lockPwd, setLockPwd] = useState('')
  const [lockPwd2, setLockPwd2] = useState('')
  const [lockBusy, setLockBusy] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockInfo, setLockInfo] = useState<string | null>(null)
  const handleLockToggle = async () => {
    setLockError(null)
    if (appLockEnabled) {
      setLockBusy(true)
      try {
        await onDisableAppLock()
        setLockInfo(null)
      } catch {
        setLockError('Impossible de désactiver le verrou.')
      } finally {
        setLockBusy(false)
      }
      return
    }
    setLockEnrolling((v) => !v)
  }
  const submitLockEnroll = async () => {
    setLockError(null)
    if (lockPwd.length < 6) { setLockError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (lockPwd !== lockPwd2) { setLockError('Les deux mots de passe ne correspondent pas.'); return }
    setLockBusy(true)
    try {
      const { biometricEnrolled } = await onEnableAppLock(lockPwd)
      setLockEnrolling(false)
      setLockPwd('')
      setLockPwd2('')
      setLockInfo(biometricEnrolled
        ? 'Verrou activé — Face ID / Touch ID configuré.'
        : 'Verrou activé — déverrouillage par mot de passe (biométrie indisponible sur cet appareil).')
    } catch {
      setLockError("Impossible d'activer le verrou sur cet appareil.")
    } finally {
      setLockBusy(false)
    }
  }

  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<DocReconcileResult | null>(null)
  const [repairFailed, setRepairFailed] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const handleRepair = async () => {
    if (repairing) return
    setRepairing(true)
    setRepairResult(null)
    setRepairFailed(false)
    setDeletedCount(0)
    try {
      setRepairResult(await onRepairDocuments())
    } catch {
      setRepairFailed(true)
    } finally {
      setRepairing(false)
    }
  }
  const handleDeleteLost = () => {
    if (!repairResult || repairResult.lost.length === 0) return
    onDeleteLostDocuments(repairResult.lost)
    setDeletedCount(repairResult.lost.length)
    setRepairResult({ ...repairResult, lost: [] })
  }

  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Réglages</h2>
        <div style={{ width: 24 }} />
      </header>
      <div className="scroll-area" style={{ paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            onClick={onProfile}
            style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Profil</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nom, photo, profession, compétences</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.9rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Apparence</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Choisissez le thème visuel</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {THEME_OPTIONS.map(t => {
                const active = theme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => onChangeTheme(t.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8,
                      padding: '0.75rem', borderRadius: 'var(--radius-md)',
                      border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: active ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: 1, background: t.swatch[0] }} />
                      <div style={{ flex: 1, background: t.swatch[1] }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.85rem' }}>{t.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{t.desc}</div>
                    </div>
                    {active && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        ✓ Actif
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={onRelaunchTutorial}
            style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>🎓</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Relancer le tutoriel</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Revoir le guide de prise en main</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Préférences</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Langue, notifications, thème</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Langue</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {LANGUAGE_OPTIONS.map(lang => {
                  const active = language === lang.id
                  return (
                    <button
                      key={lang.id}
                      onClick={() => onChangeLanguage(lang.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '0.6rem 0.4rem',
                        borderRadius: 'var(--radius-md)',
                        border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: active ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--secondary)',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{lang.flag}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{lang.label}</span>
                      {active && <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderTop: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Notifications</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {notificationsEnabled ? 'Activées — rappels et alertes patients' : 'Désactivées'}
                </div>
              </div>
              <button
                onClick={() => onToggleNotifications(!notificationsEnabled)}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: notificationsEnabled ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: notificationsEnabled ? 23 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          <button
            onClick={onPricing}
            style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #f59e0b 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Plan & Facturation</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Abonnement actuel et options</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Synchronisation cloud</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: syncConfig.color }} />
                  <span style={{ fontSize: '0.72rem', color: syncConfig.color, fontWeight: 500 }}>{isOnline ? syncConfig.label : 'Hors ligne'}</span>
                </div>
              </div>
            </div>

            {/* Santé des documents : indicateur + réparation */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.85rem', paddingTop: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: cloudDocsPending > 0 ? '#f59e0b' : '#22c55e',
                }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 500, flex: 1 }}>
                  {cloudDocsPending > 0
                    ? `${cloudDocsPending} document${cloudDocsPending > 1 ? 's' : ''} pas encore sauvegardé${cloudDocsPending > 1 ? 's' : ''} dans le cloud`
                    : 'Documents sauvegardés dans le cloud'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.7rem' }}>
                Vérifie que chaque document du dossier patient possède bien sa copie dans le cloud
                et ré-uploade ceux qui manquent. À lancer si des documents apparaissent « introuvables ».
              </div>
              <button
                onClick={handleRepair}
                disabled={repairing || !isOnline}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--primary)',
                  background: repairing || !isOnline ? 'var(--secondary)' : 'color-mix(in srgb, var(--primary) 8%, var(--surface))',
                  color: repairing || !isOnline ? 'var(--text-muted)' : 'var(--primary)',
                  fontWeight: 600, fontSize: '0.82rem',
                  cursor: repairing || !isOnline ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {repairing ? 'Vérification en cours…' : !isOnline ? 'Hors ligne — connexion requise' : 'Réparer les documents'}
              </button>

              {repairFailed && !repairing && (
                <div style={{
                  marginTop: '0.7rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--secondary)', fontSize: '0.74rem', lineHeight: 1.6,
                }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>La vérification a échoué. Réessayez quand la connexion est stable.</span>
                </div>
              )}

              {repairResult && !repairing && (
                <div style={{
                  marginTop: '0.7rem', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--secondary)', fontSize: '0.74rem', color: 'var(--text-main)', lineHeight: 1.6,
                }}>
                  <div><strong>{repairResult.checked}</strong> document{repairResult.checked > 1 ? 's' : ''} vérifié{repairResult.checked > 1 ? 's' : ''}.</div>
                  {repairResult.uploaded > 0 && (
                    <div style={{ color: '#16a34a' }}>✓ {repairResult.uploaded} réparé{repairResult.uploaded > 1 ? 's' : ''} (ré-uploadé{repairResult.uploaded > 1 ? 's' : ''} dans le cloud).</div>
                  )}
                  {repairResult.failed > 0 && (
                    <div style={{ color: '#d97706' }}>⚠ {repairResult.failed} non réparé{repairResult.failed > 1 ? 's' : ''} (réessayez plus tard).</div>
                  )}
                  {repairResult.unverified > 0 && (
                    <div style={{ color: '#d97706' }}>⚠ {repairResult.unverified} non vérifiable{repairResult.unverified > 1 ? 's' : ''} (réseau) — conservé{repairResult.unverified > 1 ? 's' : ''} par prudence.</div>
                  )}
                  {deletedCount > 0 && (
                    <div style={{ color: '#16a34a' }}>🗑 {deletedCount} document{deletedCount > 1 ? 's' : ''} perdu{deletedCount > 1 ? 's' : ''} supprimé{deletedCount > 1 ? 's' : ''} du dossier.</div>
                  )}
                  {repairResult.lost.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ color: '#dc2626' }}>
                        ✗ {repairResult.lost.length} définitivement perdu{repairResult.lost.length > 1 ? 's' : ''} (plus aucune copie, locale ou cloud)&nbsp;:
                        <div style={{ marginTop: 2, fontStyle: 'italic', wordBreak: 'break-word' }}>{repairResult.lost.map(r => r.name).join(', ')}</div>
                      </div>
                      <button
                        onClick={handleDeleteLost}
                        style={{
                          marginTop: 8, width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-md)',
                          border: '1px solid #fecaca', background: 'color-mix(in srgb, #dc2626 6%, var(--surface))',
                          color: '#dc2626', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                        }}
                      >
                        Supprimer {repairResult.lost.length} document{repairResult.lost.length > 1 ? 's' : ''} perdu{repairResult.lost.length > 1 ? 's' : ''} du dossier
                      </button>
                    </div>
                  )}
                  {repairResult.uploaded === 0 && repairResult.failed === 0 && repairResult.unverified === 0 && repairResult.lost.length === 0 && deletedCount === 0 && (
                    <div style={{ color: '#16a34a' }}>✓ Tout est en ordre, aucun document manquant.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Verrou de l'application</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Face ID / Touch ID ou mot de passe au démarrage</div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.85rem', padding: '0.6rem 0.75rem', background: 'var(--secondary)', borderRadius: 'var(--radius-md)' }}>
              Protégez l'accès à l'application par <strong>Face ID / Touch ID</strong> (ou un mot de passe de repli) à chaque démarrage. Une sécurité <strong>en plus</strong> de votre connexion, utile en cas de perte de l'appareil. Vérification <strong>100 % locale</strong>&nbsp;: fonctionne hors-ligne.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {appLockEnabled ? 'Verrou activé' : 'Verrou désactivé'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {appLockEnabled ? 'Déverrouillage requis au démarrage' : 'Aucun verrou au démarrage'}
                </div>
              </div>
              <button
                onClick={() => { void handleLockToggle() }}
                disabled={lockBusy}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none',
                  cursor: lockBusy ? 'default' : 'pointer',
                  background: appLockEnabled ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s', opacity: lockBusy ? 0.6 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: appLockEnabled ? 23 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {!appLockEnabled && lockEnrolling && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input
                  type="password" value={lockPwd} onChange={(e) => setLockPwd(e.target.value)}
                  placeholder="Mot de passe de déverrouillage (min. 6 caractères)" autoComplete="new-password"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                />
                <input
                  type="password" value={lockPwd2} onChange={(e) => setLockPwd2(e.target.value)}
                  placeholder="Confirmer le mot de passe" autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === 'Enter') void submitLockEnroll() }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                />
                <button
                  onClick={() => { void submitLockEnroll() }}
                  disabled={lockBusy}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: lockBusy ? 'default' : 'pointer', opacity: lockBusy ? 0.7 : 1 }}
                >
                  {lockBusy ? 'Activation…' : 'Activer le verrou'}
                </button>
              </div>
            )}
            {lockError && (
              <div style={{ marginTop: '0.7rem', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>{lockError}</div>
            )}
            {lockInfo && appLockEnabled && (
              <div style={{ marginTop: '0.7rem', fontSize: '0.78rem', color: '#16a34a' }}>{lockInfo}</div>
            )}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Confidentialité & Analytique</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Données d'usage anonymisées (PostHog · EU)</div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.85rem', padding: '0.6rem 0.75rem', background: 'var(--secondary)', borderRadius: 'var(--radius-md)' }}>
              PhysioScan collecte des données d'usage <strong>anonymisées</strong> pour améliorer l'application&nbsp;: écrans visités, actions effectuées (bilan créé, PDF exporté…), version utilisée. <strong>Aucune donnée patient n'est transmise.</strong> Hébergé sur serveurs EU (PostHog Cloud Europe). Vous pouvez vous désabonner à tout moment.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {analyticsEnabled ? 'Statistiques activées' : 'Statistiques désactivées'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                  {analyticsEnabled ? 'Vous contribuez à l\'amélioration de l\'app' : 'Aucune donnée d\'usage collectée'}
                </div>
              </div>
              <button
                onClick={() => onToggleAnalytics(!analyticsEnabled)}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: analyticsEnabled ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: analyticsEnabled ? 23 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          <button
            onClick={onSignOut}
            style={{ background: 'var(--surface)', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%', marginTop: '0.5rem' }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #dc2626 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.9rem' }}>Se déconnecter</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
