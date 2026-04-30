import type { Theme } from '../../hooks/useTheme'
import type { SyncStatus } from '../../hooks/useSync'

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
  onBack: () => void
  onProfile: () => void
  onPricing: () => void
  onRelaunchTutorial: () => void
  onSignOut: () => void
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
  onBack, onProfile, onPricing, onRelaunchTutorial, onSignOut,
}: SettingsPageProps) {
  const syncConfig = SYNC_STATUS_CONFIG[syncStatus]

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

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
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
