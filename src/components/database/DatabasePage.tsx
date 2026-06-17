import { useDatabaseContext } from './DatabaseContext'
import { PatientListView } from './PatientListView'
import { PatientDetailView } from './PatientDetailView'

/**
 * Écran « Patients » : coquille de navigation. Affiche soit la liste des
 * patients (<PatientListView />), soit le dossier d'un patient sélectionné
 * (<PatientDetailView />). Tout l'état est partagé via DatabaseContext —
 * cette coquille ne lit que les valeurs nécessaires à l'en-tête et au swipe.
 */
export function DatabasePage() {
  const {
    selectedPatient,
    slideEntry,
    slideEntryStyle,
    swipeDragStyle,
    swipedNav,
    setStep,
    setShowAddPatientChoice,
    onTouchEnd,
    onTouchMove,
    onTouchStart,
  } = useDatabaseContext()

  return (
        <div className={`general-info-screen ${slideEntry || swipedNav.current ? '' : 'fade-in'}`} style={{ ...swipeDragStyle, ...slideEntryStyle, padding: '0 0.35rem' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {selectedPatient ? null : (
            <header className="screen-header">
              <button className="btn-back" onClick={() => setStep('dashboard')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="title-section">Patients</h2>
              <button
                onClick={() => setShowAddPatientChoice(true)}
                aria-label="Ajouter un patient"
                style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--primary)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </header>
          )}
          <div className="scroll-area">
            {!selectedPatient ? (
              <PatientListView />
            ) : (
              <PatientDetailView />
            )}
          </div>
        </div>
  )
}
