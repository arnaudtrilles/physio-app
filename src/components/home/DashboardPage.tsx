import type { CSSProperties, MutableRefObject, TouchEvent } from 'react'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, ProfileData, ClosedTreatment } from '../../types'
import { DashboardStats } from '../DashboardStats'

type Activity = { patientKey: string; date: number; dateStr: string; type: string; zone?: string }

const parseFR = (d: string) => {
  const [dd, mm, yy] = d.split('/')
  return new Date(`${yy}-${mm}-${dd}`).getTime() || 0
}

function buildActivities(
  db: BilanRecord[],
  dbIntermediaires: BilanIntermediaireRecord[],
  dbNotes: NoteSeanceRecord[],
): Activity[] {
  return [
    ...db.filter(r => r.status === 'complet' || r.bilanData).map(r => ({
      patientKey: `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim(),
      date: parseFR(r.dateBilan),
      dateStr: r.dateBilan,
      type: 'Bilan initial',
      zone: r.zone,
    })),
    ...dbIntermediaires.map(r => ({
      patientKey: r.patientKey,
      date: parseFR(r.dateBilan),
      dateStr: r.dateBilan,
      type: 'Bilan intermédiaire',
      zone: r.zone,
    })),
    ...dbNotes.map(r => ({
      patientKey: r.patientKey,
      date: parseFR(r.dateSeance),
      dateStr: r.dateSeance,
      type: 'Séance',
      zone: r.zone,
    })),
  ]
}

type DashboardPageProps = {
  profile: ProfileData
  db: BilanRecord[]
  dbIntermediaires: BilanIntermediaireRecord[]
  dbNotes: NoteSeanceRecord[]
  dbClosedTreatments: ClosedTreatment[]
  slideEntry: 'from-left' | 'from-right' | null
  swipedNav: MutableRefObject<boolean>
  swipeDragStyle: CSSProperties
  slideEntryStyle: CSSProperties
  onTouchStart: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
  onOpenSettings: () => void
  onOpenPatient: (patientKey: string) => void
  onAllPatients: () => void
  onNewPatient: () => void
}

export function DashboardPage({
  profile,
  db,
  dbIntermediaires,
  dbNotes,
  dbClosedTreatments,
  slideEntry,
  swipedNav,
  swipeDragStyle,
  slideEntryStyle,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onOpenSettings,
  onOpenPatient,
  onAllPatients,
  onNewPatient,
}: DashboardPageProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const initials = `${(profile.nom || 'W')[0]}${(profile.prenom || '')[0] || ''}`.toUpperCase()

  const activities = buildActivities(db, dbIntermediaires, dbNotes)
  const last = activities.sort((a, b) => b.date - a.date)[0]

  return (
    <div
      className={slideEntry || swipedNav.current ? '' : 'fade-in'}
      style={{ ...swipeDragStyle, ...slideEntryStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="scroll-area" style={{ flex: 1, padding: '0.5rem 0.35rem 0' }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', paddingTop: '0.3rem' }}>
          <button
            onClick={onOpenSettings}
            style={{ position: 'absolute', top: '0.3rem', right: 0, width: 30, height: 30, borderRadius: 'var(--radius-full)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0, background: profile.photo ? 'transparent' : 'color-mix(in srgb, var(--primary) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
            {profile.photo
              ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profil" />
              : <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>{initials}</span>}
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{dateStr}</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>Bonjour, {profile.nom || profile.prenom}</div>
        </div>

        {last && (() => {
          const diff = Math.floor((Date.now() - last.date) / 86400000)
          const ago = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff}j`
          const totalThisWeek = activities.filter(a => Date.now() - a.date < 7 * 86400000).length
          return (
            <div
              onClick={() => onOpenPatient(last.patientKey)}
              style={{ background: 'var(--primary-dark)', borderRadius: 'var(--radius-xl)', padding: '1.1rem 1.15rem', marginBottom: '1rem', cursor: 'pointer', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
              <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '0.6rem' }}>Dernière activité</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>{last.patientKey}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7, marginBottom: '0.75rem' }}>
                {last.type}{last.zone ? ` · ${last.zone}` : ''} · {ago}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                  Ouvrir le dossier
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
                {totalThisWeek > 0 && (
                  <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{totalThisWeek} activité{totalThisWeek > 1 ? 's' : ''} cette semaine</span>
                )}
              </div>
            </div>
          )
        })()}

        <DashboardStats
          bilans={db}
          intermediaires={dbIntermediaires}
          notesSeance={dbNotes}
          closedTreatments={dbClosedTreatments}
          onSelectPatient={onOpenPatient}
        />
      </div>

      <div style={{ flexShrink: 0, padding: '0.6rem 0.75rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--base-bg) 70%, transparent)', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onAllPatients}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.15s', whiteSpace: 'nowrap' }}
          onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Mes patients
        </button>
        <button
          data-tutorial="new-patient-btn"
          onClick={onNewPatient}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,138,0.15)', transition: 'transform 0.15s', whiteSpace: 'nowrap' }}
          onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau patient
        </button>
      </div>
    </div>
  )
}
