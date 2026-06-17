import type { BilanRecord } from '../../types'
import { computeAge } from '../../utils/clinicalPrompt'
import { colors as c } from '../../design/tokens'
import { pk } from '../../lib/syncEngine'
import { useDatabaseContext } from './DatabaseContext'

/**
 * Vue liste des patients de la base : barre de recherche, regroupement
 * alphabétique, carte par patient (score global, âge, dernière activité) et
 * barre latérale de navigation A→Z.
 *
 * Extraction verbatim de la branche `!selectedPatient` de DatabasePage
 * (comportement et rendu identiques). Toutes les données proviennent de
 * useDatabaseContext() — aucun prop-drilling.
 */
export function PatientListView() {
  const {
    db,
    dbIntermediaires,
    dbNotes,
    searchQuery,
    setSearchQuery,
    setSelectedPatient,
    isBirthday,
    patientGeneralScore,
  } = useDatabaseContext()

  return (
              <>
                <div style={{marginBottom: '1rem'}}>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" placeholder="Rechercher un nom…"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.4rem', fontSize: '0.92rem', borderRadius: 999, border: `1px solid ${c.borderSoft}`, background: 'var(--input-bg)', color: c.text, outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }} />
                  </div>
                </div>
                {(() => {
                  const patientsMap = new Map<string, { key: string; nom: string; prenom: string; dateNaissance: string; pathologie?: string; avatarBg?: string; records: BilanRecord[] }>()
                  db.forEach(r => {
                    // Clé canonique identique à `pk()` (cloud) — sans ça un patient
                    // tapé en casse mixte vs renvoyé par le cloud (uppercase nom +
                    // titlecase prenom) générait deux entrées distinctes.
                    const key = pk(r.nom || 'Anonyme', r.prenom || '')
                    if (!patientsMap.has(key)) patientsMap.set(key, { key, nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, pathologie: r.pathologie, avatarBg: r.avatarBg, records: [] })
                    patientsMap.get(key)!.records.push(r)
                  })
                  const patients = Array.from(patientsMap.values()).filter(p => p.key.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.key.localeCompare(b.key, 'fr'))
                  if (patients.length === 0) return <div className="empty-state"><p>Aucun dossier trouvé.</p></div>

                  // Group patients by first letter
                  const grouped = new Map<string, typeof patients>()
                  patients.forEach(p => {
                    const letter = (p.nom[0] || '?').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0)
                    const key = /[A-Z]/.test(letter) ? letter : '#'
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(p)
                  })
                  const letters = Array.from(grouped.keys()).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))

                  return (
                    <div style={{ display: 'flex', position: 'relative' }}>
                      {/* Patient list */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: '5rem' }}>
                        {/* Patient count */}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.02em' }}>
                          {patients.length} patient{patients.length > 1 ? 's' : ''}
                        </div>
                        {letters.map(letter => (
                          <div key={letter} id={`patient-section-${letter}`}>
                            {/* Letter header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', marginBottom: '0.15rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{letter}</span>
                              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                            </div>
                            {/* Patients in this letter group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                              {grouped.get(letter)!.map(p => {
                                const score = patientGeneralScore(p.key)
                                const scoreColor = score === null ? '#94a3b8' : score > 0 ? '#166534' : score < 0 ? '#881337' : '#94a3b8'
                                const age = computeAge(p.dateNaissance)
                                const lastBilan = [...p.records].sort((a, b) => b.id - a.id)[0]
                                const firstBilanLabel = [...p.records].sort((a, b) => a.id - b.id).find(r => r.customLabel)?.customLabel
                                const pathoLabel = firstBilanLabel || lastBilan?.pathologie || lastBilan?.zone || ''
                                // Count total séances (bilans + intermédiaires + notes)
                                const nBilans = p.records.filter(r => r.status === 'complet' || r.bilanData).length
                                const nInter = dbIntermediaires.filter(r => r.patientKey === p.key).length
                                const nNotes = dbNotes.filter(r => r.patientKey === p.key).length
                                const totalSeances = nBilans + nInter + nNotes
                                // Last activity date across all record types
                                const parseFR = (d: string) => { const [dd, mm, yy] = d.split('/'); return new Date(`${yy}-${mm}-${dd}`).getTime() || 0 }
                                const allDates = [
                                  ...p.records.map(r => parseFR(r.dateBilan)),
                                  ...dbIntermediaires.filter(r => r.patientKey === p.key).map(r => parseFR(r.dateBilan)),
                                  ...dbNotes.filter(r => r.patientKey === p.key).map(r => parseFR(r.dateSeance)),
                                ].filter(d => d > 0)
                                const lastDate = allDates.length ? new Date(Math.max(...allDates)) : null
                                const timeAgo = (() => {
                                  if (!lastDate) return ''
                                  const diff = Date.now() - lastDate.getTime()
                                  const days = Math.floor(diff / 86400000)
                                  if (days === 0) return "Aujourd'hui"
                                  if (days === 1) return 'Hier'
                                  if (days < 7) return `Il y a ${days}j`
                                  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
                                  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
                                  return `Il y a ${Math.floor(days / 365)} an(s)`
                                })()
                                return (
                                  <div key={p.key} onClick={() => setSelectedPatient(p.key)}
                                    style={{ background: 'var(--surface)', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}
                                    onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                                    onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                                    <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
                                      {(p.nom[0] || '?')}{(p.prenom[0] || '?')}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {p.key}
                                        {isBirthday(p.dateNaissance) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="14" width="18" height="8" rx="2"/><rect x="6" y="11" width="12" height="3" rx="1"/><line x1="8.5" y1="11" x2="8.5" y2="7"/><line x1="12" y1="11" x2="12" y2="7"/><line x1="15.5" y1="11" x2="15.5" y2="7"/><path d="M7.5 5.5c1-1.5 1-1.5 2 0M11 5.5c1-1.5 1-1.5 2 0M14.5 5.5c1-1.5 1-1.5 2 0"/></svg>}
                                      </div>
                                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {age !== null && <>{age} ans</>}{age !== null && pathoLabel ? ' · ' : ''}{pathoLabel}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        {totalSeances > 0 && <span>{totalSeances} séance{totalSeances > 1 ? 's' : ''}</span>}
                                        {totalSeances > 0 && timeAgo && <span>·</span>}
                                        {timeAgo && <span>{timeAgo}</span>}
                                        {totalSeances === 0 && !timeAgo && <span style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', fontSize: '0.62rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)' }}>Nouveau</span>}
                                      </div>
                                    </div>
                                    {score !== null
                                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.78rem', color: scoreColor, flexShrink: 0 }}>
                                          {score > 0 ? (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                          ) : score < 0 ? (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                          ) : (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                          )}
                                          {Math.abs(score)}%
                                        </span>
                                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                                    }
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Alphabet sidebar */}
                      {!searchQuery && letters.length > 1 && (
                        <div
                          style={{ position: 'sticky', top: 0, right: 0, height: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '0.35rem 0.15rem', marginLeft: '0.85rem', zIndex: 20, alignSelf: 'flex-start', flexShrink: 0, width: 22 }}
                          onTouchMove={e => {
                            const touch = e.touches[0]
                            const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
                            if (el?.dataset?.letter) {
                              const section = document.getElementById(`patient-section-${el.dataset.letter}`)
                              section?.scrollIntoView({ behavior: 'auto', block: 'start' })
                            }
                          }}
                        >
                          {letters.map(l => (
                            <button key={l} data-letter={l}
                              onClick={() => {
                                const section = document.getElementById(`patient-section-${l}`)
                                section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              style={{ width: 20, height: 20, borderRadius: 'var(--radius-full)', border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.62rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background 0.15s, color 0.15s' }}
                              onPointerEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white' }}
                              onPointerLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)' }}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
  )
}
