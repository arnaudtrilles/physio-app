import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, BilanType, PrescriptionEntry } from '../../types'
import { getBilanType, DEFAULT_ZONE_FOR_BILAN } from '../../utils/bilanRouter'
import { computeAge } from '../../utils/clinicalPrompt'
import { callClaudeSecure } from '../../utils/claudeSecure'
import { pdfToImages } from '../../utils/pdfToImages'
import { analyseSeanceMiniSchema } from '../../utils/validation'
import { colors as c } from '../../design/tokens'
import { PatientHeader } from '../patient/PatientHeader'
import { PatientHeroCard } from '../patient/PatientHeroCard'
import { ConsultationChooser } from '../patient/ConsultationChooser'
import { EvolutionChart, type EvolutionPoint } from '../EvolutionChart'
import { ScoreEvolutionChart } from '../ScoreEvolutionChart'
import { TreatmentBodyChart } from '../TreatmentBodyChart'
import { DossierDocuments } from '../DossierDocuments'
import { SmartObjectifs } from '../SmartObjectifs'
import { SwipeToDelete } from '../shared/SwipeToDelete'
import { useDatabaseContext, type TreatmentEpisode } from './DatabaseContext'

export function DatabasePage() {
  const {
    apiKey,
    consultationChooserOpen,
    db,
    dbIntermediaires,
    dbNotes,
    dbObjectifs,
    dbPatientDocs,
    dbPrescriptions,
    expandedClosedEpisodes,
    exportingRecordId,
    editingLabelBilanId,
    labelDraft,
    openAnalyseNoteIds,
    openNoteDetailIds,
    openTimelineKey,
    orphanPopupOpen,
    rxDocViewer,
    rxEditDoc,
    rxEditForm,
    rxEditPopup,
    rxGroupPicker,
    searchQuery,
    selectedPatient,
    slideEntry,
    slideEntryStyle,
    swipeDragStyle,
    swipedNav,
    setBilanDocuments,
    setBilanIntermediaireZone,
    setBilanNotes,
    setBilanZoneBackStep,
    setConsultationChooserOpen,
    setCurrentAnalyseIA,
    setCurrentBilanDataOverride,
    setCurrentBilanId,
    setCurrentBilanIntermediaireData,
    setCurrentBilanIntermediaireId,
    setCurrentNoteSeanceData,
    setCurrentNoteSeanceId,
    setDb,
    setDbNotes,
    setDbObjectifs,
    setDbPatientDocs,
    setDbPrescriptions,
    setDeletingBilanId,
    setDeletingIntermediaireId,
    setDeletingNoteSeanceId,
    setDeletingPatientKey,
    setEditingLabelBilanId,
    setEvolutionZoneType,
    setExpandedClosedEpisodes,
    setFicheBackStep,
    setFicheExerciceContextOverride,
    setFicheExerciceSource,
    setFormData,
    setLabelDraft,
    setLetterZonePicker,
    setNoteSeanceZone,
    setOpenAnalyseNoteIds,
    setOpenNoteDetailIds,
    setOrphanPopupOpen,
    setPatientDocMaskingQueue,
    setPatientMode,
    setResumeBilan,
    setRxDocViewer,
    setRxEditDoc,
    setRxEditForm,
    setRxEditPopup,
    setRxGroupPicker,
    setRxMaskingItem,
    setSearchQuery,
    setSelectedBodyZone,
    setSelectedPatient,
    setShowAddPatientChoice,
    setSilhouetteData,
    setStep,
    closeTreatment,
    deleteClosedEpisode,
    exportBilanFromRecord,
    getClosureTimes,
    getIntermediairePreFill,
    getPatientBilans,
    getPatientBilanTypes,
    getPatientIntermediaires,
    getPatientNotes,
    getTreatmentEpisodes,
    improvDelta,
    isBirthday,
    isPrescriptionCurrent,
    isTreatmentClosed,
    isZoneCollapsed,
    openNoteIntermediaire,
    parseFrDate,
    patientGeneralScore,
    recordAIAudit,
    reopenTreatment,
    showToast,
    stripMd,
    toggleTimeline,
    toggleZoneCollapsed,
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
                    const key = `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim()
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
            ) : (
              <>
                {(() => {
                  const allPatientRecords = getPatientBilans(selectedPatient)
                  const firstR = allPatientRecords[0]
                  const isPlaceholder = (r: BilanRecord) => r.status === 'incomplet' && !r.bilanData
                  const bilans = allPatientRecords.filter(r => !isPlaceholder(r))
                  // Hero card derivations
                  const rxForHero = dbPrescriptions.find(p => p.patientKey === selectedPatient)
                  const lastBilanForHero = bilans[bilans.length - 1]
                  const notesSortedForHero = [...getPatientNotes(selectedPatient ?? '')].sort((a, b) => (a.dateSeance || '').localeCompare(b.dateSeance || ''))
                  const lastNoteForHero = notesSortedForHero[notesSortedForHero.length - 1]
                  // Zones available for the consultation chooser (excludes closed PECs)
                  const ZONE_LABELS_SHORT: Record<string, string> = {
                    epaule: 'Épaule',
                    cheville: 'Cheville',
                    genou: 'Genou',
                    hanche: 'Hanche',
                    cervical: 'Rachis Cervical',
                    lombaire: 'Rachis Lombaire',
                    generique: 'Autres bilans',
                    geriatrique: 'Gériatrie',
                    'drainage-lymphatique': 'Drainage Lymphatique',
                  }
                  const zoneHasBilans = new Map<string, boolean>()
                  bilans.forEach(b => {
                    const key = b.bilanType ?? getBilanType(b.zone ?? '')
                    zoneHasBilans.set(key, true)
                  })
                  getPatientIntermediaires(selectedPatient ?? '').forEach(r => {
                    const key = r.bilanType ?? getBilanType(r.zone ?? '')
                    if (!zoneHasBilans.has(key)) zoneHasBilans.set(key, false)
                  })
                  getPatientNotes(selectedPatient ?? '').forEach(n => {
                    const key = n.bilanType ?? getBilanType(n.zone ?? '')
                    if (!zoneHasBilans.has(key)) zoneHasBilans.set(key, false)
                  })
                  // Zones créées depuis une prescription (même sans aucun bilan/séance)
                  ;(rxForHero?.prescriptions ?? []).forEach(pr => {
                    if (pr.bilanType && !zoneHasBilans.has(pr.bilanType)) zoneHasBilans.set(pr.bilanType, false)
                  })
                  const genericCustomLabel = (rxForHero?.prescriptions ?? []).find(pr => pr.bilanType === 'generique')?.customLabel
                  const zonesForPicker = Array.from(zoneHasBilans.entries())
                    .filter(([bt]) => !isTreatmentClosed(selectedPatient ?? '', bt as BilanType))
                    .map(([bt, hasBilans]) => ({
                      bilanType: bt,
                      label: bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt),
                      accent: c.primary,
                      hasBilans,
                    }))
                  const hasAnyBilanForPicker = bilans.length > 0
                  return (
                    <>
                      <PatientHeader
                        name={selectedPatient ?? ''}
                        initials={`${firstR?.nom[0] || '?'}${firstR?.prenom[0] || '?'}`}
                        avatarBg={firstR?.avatarBg}
                        birthday={isBirthday(firstR?.dateNaissance)}
                        infoLine={(() => {
                          const parts: string[] = []
                          if (firstR?.dateNaissance) {
                            const age = computeAge(firstR.dateNaissance)
                            if (age !== null) parts.push(`${age} ans`)
                          }
                          return parts.length > 0 ? parts.join(' · ') : undefined
                        })()}
                        stats={[
                          { label: 'Depuis', value: (() => {
                            const d = firstR?.dateBilan
                            if (!d) return '—'
                            const parts = d.includes('-') ? d.split('-') : d.split('/')
                            const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
                            const day = d.includes('-') ? parts[2] : parts[0]
                            const monthIdx = parseInt(d.includes('-') ? parts[1] : parts[1], 10) - 1
                            return `${parseInt(day, 10)} ${months[monthIdx] ?? ''}`
                          })() },
                          { label: 'Bilans', value: String(bilans.length) },
                          { label: 'Séances', value: String(getPatientNotes(selectedPatient ?? '').length + bilans.length + getPatientIntermediaires(selectedPatient ?? '').length) },
                        ]}
                        onBack={() => setSelectedPatient(null)}
                      />
                      <PatientHeroCard
                        activeZones={(() => {
                          const zoneMap = new Map<string, number>()
                          const allNotes = getPatientNotes(selectedPatient ?? '')
                          const allInterms = getPatientIntermediaires(selectedPatient ?? '')
                          for (const b of bilans) {
                            const bt = b.bilanType ?? getBilanType(b.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          for (const n of allNotes) {
                            const bt = n.bilanType ?? getBilanType(n.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          for (const i of allInterms) {
                            const bt = i.bilanType ?? getBilanType(i.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          return Array.from(zoneMap.entries()).map(([bt, count]) => ({
                            label: bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt),
                            count,
                          }))
                        })()}
                        lastConsultation={lastNoteForHero?.dateSeance ?? lastBilanForHero?.dateBilan ?? null}
                        lastConsultationZone={(() => {
                          const lastNote = lastNoteForHero
                          const lastBilan = lastBilanForHero
                          const noteDate = lastNote?.dateSeance ?? ''
                          const bilanDate = lastBilan?.dateBilan ?? ''
                          const lastRecord = noteDate >= bilanDate ? lastNote : lastBilan
                          if (!lastRecord) return null
                          const bt = ('bilanType' in lastRecord ? lastRecord.bilanType : undefined) ?? getBilanType(lastRecord.zone ?? '')
                          return bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt)
                        })()}
                        onAddConsultation={() => setConsultationChooserOpen(true)}
                      />

                      {/* ── Prescription tracking (hidden for v1 launch) ── */}
                      {false && (() => {
                        const rx = dbPrescriptions.find(p => p.patientKey === selectedPatient)
                        const noteCount = getPatientNotes(selectedPatient ?? '').length
                        const bilanCount = bilans.length
                        const intermCount = getPatientIntermediaires(selectedPatient ?? '').length
                        const anterieures = rx?.seancesAnterieures ?? 0
                        const totalSeances = noteCount + bilanCount + intermCount + anterieures
                        const rxListRaw: PrescriptionEntry[] = rx?.prescriptions ?? (rx?.nbSeancesPrescrites ? [{ id: 1, nbSeances: rx!.nbSeancesPrescrites!, datePrescription: rx!.datePrescription ?? '', prescripteur: rx!.prescripteur ?? '' }] : [])
                        // Ne garder que les prescriptions de l'épisode courant (après la dernière clôture)
                        const rxList = rxListRaw.filter(pr => isPrescriptionCurrent(selectedPatient ?? '', pr))
                        const totalPrescribed = rxList.reduce((s, r) => s + r.nbSeances, 0)
                        const overLimit = totalPrescribed > 0 && totalSeances > totalPrescribed

                        // Pool of completed sessions per bilanType (for zone-scoped prescriptions)
                        const poolFor = (bt: BilanType) => {
                          // Ne compter que les records de l'épisode courant (après la dernière clôture)
                          const closureTimes = getClosureTimes(selectedPatient ?? '', bt)
                          const cutoff = closureTimes.length > 0 ? closureTimes[closureTimes.length - 1] : 0
                          const zNotes = getPatientNotes(selectedPatient ?? '').filter(n => (n.bilanType ?? getBilanType(n.zone ?? '')) === bt && n.id > cutoff).length
                          const zBilans = bilans.filter(b => (b.bilanType ?? getBilanType(b.zone ?? '')) === bt && b.id > cutoff).length
                          const zInterms = getPatientIntermediaires(selectedPatient ?? '').filter(i => (i.bilanType ?? getBilanType(i.zone ?? '')) === bt && i.id > cutoff).length
                          return zNotes + zBilans + zInterms
                        }
                        const consumedByBt = new Map<string, number>()
                        const rxProgress = rxList.map(r => {
                          const key = r.bilanType ?? '__global__'
                          const pool = r.bilanType ? poolFor(r.bilanType) : totalSeances
                          const consumed = consumedByBt.get(key) ?? 0
                          const start = consumed
                          const done = Math.min(r.nbSeances, Math.max(0, pool - consumed))
                          consumedByBt.set(key, consumed + r.nbSeances)
                          return { ...r, done, start }
                        })

                        // Sessions hors prescription (only relevant si aucune prescription globale)
                        const hasGlobalRx = rxList.some(r => !r.bilanType)
                        const coveredBts = new Set<string>(rxList.map(r => r.bilanType).filter((x): x is BilanType => !!x))
                        const orphanSessions = hasGlobalRx
                          ? []
                          : (() => {
                              const out: { kind: 'bilan' | 'note' | 'interm'; bilanType: BilanType; date: string }[] = []
                              bilans.forEach(b => {
                                const bt = b.bilanType ?? getBilanType(b.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'bilan', bilanType: bt, date: b.dateBilan ?? '' })
                              })
                              getPatientNotes(selectedPatient ?? '').forEach(n => {
                                const bt = n.bilanType ?? getBilanType(n.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'note', bilanType: bt, date: n.dateSeance ?? '' })
                              })
                              getPatientIntermediaires(selectedPatient ?? '').forEach(i => {
                                const bt = i.bilanType ?? getBilanType(i.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'interm', bilanType: bt, date: i.dateBilan ?? '' })
                              })
                              return out
                            })()

                        const saveRx = (activePrescriptions: PrescriptionEntry[], seancesAnt?: number) => {
                          // Préserver les prescriptions des épisodes antérieurs (avant la dernière clôture) —
                          // elles ne sont pas visibles dans rxList mais doivent rester en base pour l'historique.
                          const archived = rxListRaw.filter(pr => !isPrescriptionCurrent(selectedPatient ?? '', pr))
                          const prescriptions = [...archived, ...activePrescriptions]
                          setDbPrescriptions(prev => {
                            const idx = prev.findIndex(p => p.patientKey === selectedPatient)
                            const base = idx >= 0 ? prev[idx] : { patientKey: selectedPatient ?? '', prescriptions: [] }
                            const updated = { ...base, prescriptions, ...(seancesAnt !== undefined ? { seancesAnterieures: seancesAnt } : {}) }
                            return idx >= 0 ? prev.map((p, i) => i === idx ? updated : p) : [...prev, updated]
                          })
                        }

                        return (
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {`${totalSeances} séance${totalSeances > 1 ? 's' : ''}`}
                                {orphanSessions.length > 0 && (
                                  <span
                                    onClick={() => setOrphanPopupOpen(true)}
                                    title="Voir les séances hors prescription"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 999, padding: '2px 7px', cursor: 'pointer' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    {orphanSessions.length} hors prescription
                                  </span>
                                )}
                                {overLimit && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                  </svg>
                                )}
                              </span>
                              <button type="button" onClick={() => {
                                setRxEditForm({ nbSeances: '', prescripteur: rxList[rxList.length - 1]?.prescripteur ?? '', datePrescription: new Date().toLocaleDateString('fr-FR'), seancesAnterieures: String(anterieures), bilanType: '', customLabel: '' })
                                setRxEditDoc(null)
                                setRxEditPopup({ mode: 'add' })
                              }} style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                + Prescription
                              </button>
                            </div>

                            {rxList.length > 0 && (() => {
                              // Group by bilanType: 2 ordonnances for the same zone merge into one combined bar
                              const groupOrder: string[] = []
                              const groupsMap = new Map<string, typeof rxProgress>()
                              rxProgress.forEach(r => {
                                const key = r.bilanType ?? '__global__'
                                if (!groupsMap.has(key)) { groupsMap.set(key, []); groupOrder.push(key) }
                                groupsMap.get(key)!.push(r)
                              })
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {groupOrder.map(key => {
                                    const entries = groupsMap.get(key)!
                                    const combinedDone = entries.reduce((s, e) => s + e.done, 0)
                                    const combinedTotal = entries.reduce((s, e) => s + e.nbSeances, 0)
                                    const pct = combinedTotal > 0 ? Math.min(100, Math.round((combinedDone / combinedTotal) * 100)) : 0
                                    const latest = entries[entries.length - 1]
                                    const defaultZoneLabel = key === '__global__' ? 'Prescription' : (ZONE_LABELS_SHORT[key] ?? key)
                                    const label = key === 'generique' && latest.customLabel ? latest.customLabel : defaultZoneLabel
                                    const hasMultiple = entries.length > 1
                                    const anyDoc = entries.find(e => e.document)
                                    return (
                                      <div key={key} style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          if (entries.length === 1) {
                                            const r = entries[0]
                                            setRxEditForm({ nbSeances: String(r.nbSeances), prescripteur: r.prescripteur, datePrescription: r.datePrescription, seancesAnterieures: String(anterieures), bilanType: r.bilanType ?? '', customLabel: r.customLabel ?? '' })
                                            setRxEditDoc(r.document ?? null)
                                            setRxEditPopup({ mode: 'edit', entry: r })
                                          } else {
                                            setRxGroupPicker(entries)
                                          }
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                            {label} — {combinedDone}/{combinedTotal}
                                            {latest.prescripteur ? ` · Dr ${latest.prescripteur}` : ''}
                                            {hasMultiple && <span style={{ marginLeft: 4, fontWeight: 700, color: 'var(--primary)' }}>· {entries.length} ord.</span>}
                                          </span>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                            {latest.datePrescription}
                                            {anyDoc && (
                                              <button type="button" onClick={e => { e.stopPropagation(); setRxDocViewer(anyDoc.document!) }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', alignItems: 'center' }}
                                                title="Voir l'ordonnance">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                              </button>
                                            )}
                                          </span>
                                        </div>
                                        <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#16a34a' : pct >= 67 ? '#f59e0b' : 'var(--primary)', borderRadius: 2, transition: 'width 0.3s' }} />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}

                            {/* Popup prescription */}
                            {rxEditPopup && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxEditPopup(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', marginBottom: 12 }}>
                                    {rxEditPopup!.mode === 'add' ? 'Nouvelle prescription' : 'Modifier la prescription'}
                                  </div>

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Nombre de séances</label>
                                  <input type="number" min="1" value={rxEditForm.nbSeances} onChange={e => setRxEditForm(f => ({ ...f, nbSeances: e.target.value }))}
                                    placeholder="9" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Traitement concerné</label>
                                  <select value={rxEditForm.bilanType} onChange={e => setRxEditForm(f => ({ ...f, bilanType: e.target.value as BilanType | '' }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }}>
                                    <option value="">Toutes zones (global)</option>
                                    {(Object.keys(ZONE_LABELS_SHORT) as BilanType[]).map(bt => (
                                      <option key={bt} value={bt}>{ZONE_LABELS_SHORT[bt]}</option>
                                    ))}
                                  </select>

                                  {rxEditForm.bilanType === 'generique' && (
                                    <>
                                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Nom du traitement</label>
                                      <input value={rxEditForm.customLabel} onChange={e => setRxEditForm(f => ({ ...f, customLabel: e.target.value }))}
                                        placeholder="Ex : ATM, poignet, coude…" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />
                                    </>
                                  )}

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Prescripteur</label>
                                  <input value={rxEditForm.prescripteur} onChange={e => setRxEditForm(f => ({ ...f, prescripteur: e.target.value }))}
                                    placeholder="Dr Dupont" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Date de prescription</label>
                                  <input value={rxEditForm.datePrescription} onChange={e => setRxEditForm(f => ({ ...f, datePrescription: e.target.value }))}
                                    placeholder="12/04/2026" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Séances déjà effectuées</label>
                                  <input type="number" min="0" value={rxEditForm.seancesAnterieures} onChange={e => setRxEditForm(f => ({ ...f, seancesAnterieures: e.target.value }))}
                                    placeholder="0" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Ordonnance</label>
                                  {rxEditDoc ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 10px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                      <span style={{ flex: 1, fontSize: '0.78rem', color: '#15803d', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rxEditDoc!.name}</span>
                                      <button type="button" onClick={() => setRxDocViewer(rxEditDoc)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                      </button>
                                      <button type="button" onClick={() => setRxEditDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                      {[
                                        { label: 'Photo', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>, accept: 'image/*', capture: 'environment' as const },
                                        { label: 'Galerie', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, accept: 'image/*', capture: undefined },
                                        { label: 'Fichier', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, accept: 'image/*,application/pdf', capture: undefined },
                                      ].map(opt => (
                                        <label key={opt.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                          {opt.icon}
                                          {opt.label}
                                          <input type="file" accept={opt.accept} capture={opt.capture} hidden onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            const reader = new FileReader()
                                            reader.onload = () => {
                                              const dataUrl = reader.result as string
                                              if (file.type.startsWith('image/')) {
                                                setRxMaskingItem({ dataUrl, name: file.name, mimeType: file.type })
                                              } else {
                                                const base64 = dataUrl.split(',')[1]
                                                setRxEditDoc({ data: base64, mimeType: file.type, name: file.name })
                                              }
                                            }
                                            reader.readAsDataURL(file)
                                            e.target.value = ''
                                          }} />
                                        </label>
                                      ))}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => {
                                      const nb = parseInt(rxEditForm.nbSeances, 10)
                                      if (isNaN(nb) || nb <= 0) { showToast('Nombre de séances invalide', 'error'); return }
                                      const ant = parseInt(rxEditForm.seancesAnterieures, 10) || 0
                                      const bt = rxEditForm.bilanType || undefined
                                      const cl = bt === 'generique' ? (rxEditForm.customLabel.trim() || undefined) : undefined
                                      if (rxEditPopup!.mode === 'add') {
                                        const newEntry: PrescriptionEntry = { id: Date.now(), nbSeances: nb, prescripteur: rxEditForm.prescripteur.trim(), datePrescription: rxEditForm.datePrescription, ...(rxEditDoc ? { document: rxEditDoc } : {}), ...(bt ? { bilanType: bt } : {}), ...(cl ? { customLabel: cl } : {}) }
                                        // Propager le customLabel à TOUTES les prescriptions générique du patient (un seul label par patient pour cette zone)
                                        const nextList = cl
                                          ? [...rxList.map(pr => pr.bilanType === 'generique' ? { ...pr, customLabel: cl } : pr), newEntry]
                                          : [...rxList, newEntry]
                                        saveRx(nextList, ant)
                                      } else if (rxEditPopup!.entry) {
                                        saveRx(rxList.map(pr => {
                                          if (pr.id === rxEditPopup!.entry!.id) {
                                            return { ...pr, nbSeances: nb, prescripteur: rxEditForm.prescripteur.trim(), datePrescription: rxEditForm.datePrescription, document: rxEditDoc ?? undefined, bilanType: bt, customLabel: cl }
                                          }
                                          // Synchroniser le customLabel sur les autres prescriptions générique
                                          if (bt === 'generique' && pr.bilanType === 'generique') {
                                            return { ...pr, customLabel: cl }
                                          }
                                          return pr
                                        }), ant)
                                      }
                                      setRxEditPopup(null)
                                    }} style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      {rxEditPopup!.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
                                    </button>
                                    {rxEditPopup!.mode === 'edit' && (
                                      <button onClick={() => {
                                        const ant = parseInt(rxEditForm.seancesAnterieures, 10) || 0
                                        saveRx(rxList.filter(pr => pr.id !== rxEditPopup!.entry!.id), ant)
                                        setRxEditPopup(null)
                                      }} style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        Supprimer
                                      </button>
                                    )}
                                    <button onClick={() => setRxEditPopup(null)}
                                      style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Popup séances hors prescription */}
                            {orphanPopupOpen && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setOrphanPopupOpen(false)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Séances hors prescription</div>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Ces séances ne sont rattachées à aucune prescription. Ajoute une prescription pour la zone concernée.
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '40vh', overflowY: 'auto', marginBottom: 12 }}>
                                    {orphanSessions.map((o, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.7rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 56 }}>
                                          {o.kind === 'bilan' ? 'Bilan' : o.kind === 'interm' ? 'Interm.' : 'Séance'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{o.bilanType === 'generique' && rxList.find(pr => pr.bilanType === 'generique')?.customLabel ? rxList.find(pr => pr.bilanType === 'generique')!.customLabel : (ZONE_LABELS_SHORT[o.bilanType] ?? o.bilanType)}</div>
                                          {o.date && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{o.date.includes('-') ? o.date.split('-').reverse().join('/') : o.date}</div>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => {
                                      const firstBt = orphanSessions[0]?.bilanType
                                      setOrphanPopupOpen(false)
                                      setRxEditForm({ nbSeances: '', prescripteur: rxList[rxList.length - 1]?.prescripteur ?? '', datePrescription: new Date().toLocaleDateString('fr-FR'), seancesAnterieures: String(anterieures), bilanType: firstBt ?? '', customLabel: '' })
                                      setRxEditDoc(null)
                                      setRxEditPopup({ mode: 'add' })
                                    }} style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Ajouter une prescription
                                    </button>
                                    <button onClick={() => setOrphanPopupOpen(false)}
                                      style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Fermer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Popup choix d'ordonnance dans un groupe */}
                            {rxGroupPicker && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxGroupPicker(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', marginBottom: 4 }}>
                                    {rxGroupPicker![0].bilanType === 'generique' && rxGroupPicker![0].customLabel ? rxGroupPicker![0].customLabel : (rxGroupPicker![0].bilanType ? (ZONE_LABELS_SHORT[rxGroupPicker![0].bilanType!] ?? rxGroupPicker![0].bilanType) : 'Prescription')}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    {rxGroupPicker!.length} ordonnance{rxGroupPicker!.length > 1 ? 's' : ''} — sélectionne celle à modifier
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                    {rxGroupPicker!.map((r, i) => (
                                      <button key={r.id} type="button" onClick={() => {
                                        setRxEditForm({ nbSeances: String(r.nbSeances), prescripteur: r.prescripteur, datePrescription: r.datePrescription, seancesAnterieures: String(anterieures), bilanType: r.bilanType ?? '', customLabel: r.customLabel ?? '' })
                                        setRxEditDoc(r.document ?? null)
                                        setRxGroupPicker(null)
                                        setRxEditPopup({ mode: 'edit', entry: r })
                                      }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {r.done}/{r.nbSeances} séances
                                          </div>
                                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                            {r.datePrescription}{r.prescripteur ? ` · Dr ${r.prescripteur}` : ''}
                                          </div>
                                        </div>
                                        {r.document && (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  <button onClick={() => setRxGroupPicker(null)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Viewer ordonnance */}
                            {rxDocViewer && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxDocViewer(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary-dark)' }}>Ordonnance</span>
                                    <button onClick={() => setRxDocViewer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  </div>
                                  {rxDocViewer!.mimeType === 'application/pdf' ? (
                                    <iframe src={`data:application/pdf;base64,${rxDocViewer!.data}`} style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: 8 }} />
                                  ) : (
                                    <img src={`data:${rxDocViewer!.mimeType};base64,${rxDocViewer!.data}`} alt="Ordonnance" style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* ── Banner sans bilan ────────────────── */}
                      {bilans.length === 0 && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#92400e' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span>Aucun bilan initial — vous pouvez en créer un à tout moment via le bouton ci-dessous.</span>
                        </div>
                      )}

                      {/* ── Objectifs SMART ────────────────── */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OBJECTIFS SMART</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                        </div>
                        <SmartObjectifs objectifs={dbObjectifs} patientKey={selectedPatient ?? ''} onUpdate={setDbObjectifs} maxObjectifs={zonesForPicker.length} />
                      </div>

                      {/* Amélioration globale supprimée — pourcentage intégré dans le graphique */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '5rem' }}>
                        {(() => {
                          const ZONE_SECTION_LABELS: Record<string, string> = {
                            epaule: 'Épaule',
                            cheville: 'Cheville',
                            genou: 'Genou',
                            hanche: 'Hanche',
                            cervical: 'Rachis Cervical',
                            lombaire: 'Rachis Lombaire',
                            generique: 'Autres bilans',
                            geriatrique: 'Gériatrie',
                            'drainage-lymphatique': 'Drainage Lymphatique',
                          }
                          const groupMap = new Map<string, typeof bilans>()
                          bilans.forEach(record => {
                            const key = record.bilanType ?? getBilanType(record.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                            groupMap.get(key)!.push(record)
                          })
                          // Zones qui n'ont pas de bilan initial mais ont des intermédiaires ou des séances :
                          // créer un groupe vide pour qu'elles apparaissent dans le rendu zone-scoped (avec boutons).
                          getPatientIntermediaires(selectedPatient ?? '').forEach(r => {
                            const key = r.bilanType ?? getBilanType(r.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                          })
                          getPatientNotes(selectedPatient ?? '').forEach(n => {
                            const key = n.bilanType ?? getBilanType(n.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                          })
                          // Zones créées depuis une prescription (même sans bilan/séance) : section vide.
                          // Inclut les zones clôturées avec seulement des prescriptions archivées
                          // (pour afficher la barre verte "Prescription clôturée" sans avoir besoin d'un bilan).
                          ;(dbPrescriptions.find(p => p.patientKey === selectedPatient)?.prescriptions ?? []).forEach(pr => {
                            if (pr.bilanType && !groupMap.has(pr.bilanType)) {
                              groupMap.set(pr.bilanType, [])
                            }
                          })
                          const groups = Array.from(groupMap.entries())
                          const showSections = groups.length > 1
                          // Expansion en (zoneType × épisode) — chaque épisode rend sa propre carte.
                          // Une PEC clôturée puis reprise (nouvelle ordo) donne 2 cartes distinctes :
                          // une verte "PEC terminée" (ancien épisode) + une active (nouvel épisode).
                          type ZoneEp = { zoneType: BilanType; zoneBilansAll: BilanRecord[]; episode: TreatmentEpisode; totalEpisodes: number }
                          const zoneEps: ZoneEp[] = groups.flatMap(([zoneType, zoneBilansAll]) => {
                            const eps = getTreatmentEpisodes(selectedPatient ?? '', zoneType as BilanType)
                            if (eps.length === 0) return [{ zoneType: zoneType as BilanType, zoneBilansAll, episode: { idx: 0, startExclusive: Number.NEGATIVE_INFINITY, endInclusive: Number.POSITIVE_INFINITY, isActive: true } as TreatmentEpisode, totalEpisodes: 1 }]
                            return eps.map(ep => ({ zoneType: zoneType as BilanType, zoneBilansAll, episode: ep, totalEpisodes: eps.length }))
                          })
                          zoneEps.sort((a, b) => (a.episode.isActive === b.episode.isActive ? 0 : a.episode.isActive ? -1 : 1))
                          return zoneEps.map(({ zoneType, zoneBilansAll, episode, totalEpisodes }) => {
                            const inEp = (id: number) => id > episode.startExclusive && id <= episode.endInclusive
                            const zoneBilans = zoneBilansAll.filter(b => inEp(b.id))
                            // ── Graphique d'évolution EVN/EVA pour cette zone ──
                            const evolutionPoints: EvolutionPoint[] = (() => {
                              const pts: EvolutionPoint[] = []
                              // 1) Bilans initiaux
                              for (const b of zoneBilans) {
                                // evn peut être number, string-number, ou absent
                                // Cascade : evn direct → douleur.evnPire → douleur.evnMoy → douleur.evnMvt → douleur.evnRepos → douleur.evnMieux
                                const directEvn = b.evn != null ? parseFloat(String(b.evn)) : NaN
                                const d = b.bilanData?.douleur as Record<string, unknown> | undefined
                                const tryParse = (...keys: string[]) => {
                                  for (const k of keys) {
                                    const v = parseFloat(String(d?.[k] ?? ''))
                                    if (!isNaN(v)) return v
                                  }
                                  return NaN
                                }
                                const fallbackEvn = tryParse('evnPire', 'evnMoy', 'evnMvt', 'evnRepos', 'evnMieux')
                                const evnNum = !isNaN(directEvn) ? directEvn : (!isNaN(fallbackEvn) ? fallbackEvn : null)
                                if (evnNum == null) continue
                                pts.push({
                                  date: b.dateBilan,
                                  value: evnNum,
                                  kind: 'bilan',
                                  label: `Bilan initial · ${b.dateBilan}`,
                                })
                              }
                              // 2) Intermédiaires de cette zone (épisode courant)
                              const zoneInters = getPatientIntermediaires(selectedPatient ?? '')
                                .filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))
                              for (const r of zoneInters) {
                                const tc = (r.data?.troncCommun as Record<string, unknown>) ?? {}
                                const evnObj = (tc.evn as Record<string, unknown>) ?? {}
                                const v = parseFloat(String(evnObj.pireActuel ?? evnObj.moyActuel ?? ''))
                                if (isNaN(v)) continue
                                pts.push({
                                  date: r.dateBilan,
                                  value: v,
                                  kind: 'intermediaire',
                                  label: `Bilan intermédiaire · ${r.dateBilan}`,
                                })
                              }
                              // 3) Notes de séance de cette zone (épisode courant)
                              const zoneNotes = dbNotes
                                .filter(n => n.patientKey === selectedPatient && (n.bilanType ?? getBilanType(n.zone ?? '')) === zoneType && inEp(n.id))
                              for (const n of zoneNotes) {
                                const v = parseFloat(String(n.data.eva ?? ''))
                                if (isNaN(v)) continue
                                pts.push({
                                  date: n.dateSeance,
                                  value: v,
                                  kind: 'note',
                                  label: `Séance n°${n.numSeance} · ${n.dateSeance}`,
                                })
                              }
                              return pts
                            })()
                            const zoneClosed = !episode.isActive
                            // Épisodes clôturés : repliés par défaut, mais dépliables via tap sur le header.
                            // Épisodes actifs : dépliés par défaut, repliables via tap.
                            const closedEpKey = episode.closure ? `${selectedPatient ?? ''}::${zoneType}::${episode.closure.id}` : ''
                            const zoneCollapsed = zoneClosed
                              ? !expandedClosedEpisodes.has(closedEpKey)
                              : isZoneCollapsed(selectedPatient ?? '', zoneType as BilanType)
                            const toggleThisEpisode = () => {
                              if (zoneClosed) {
                                setExpandedClosedEpisodes(prev => {
                                  const next = new Set(prev)
                                  if (next.has(closedEpKey)) next.delete(closedEpKey); else next.add(closedEpKey)
                                  return next
                                })
                              } else {
                                toggleZoneCollapsed(selectedPatient ?? '', zoneType as BilanType)
                              }
                            }
                            const zoneIntermCount = getPatientIntermediaires(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id)).length
                            const zoneNotesCount = getPatientNotes(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id)).length
                            // Prescriptions de CET épisode uniquement (id dans la fenêtre)
                            const rxListForZone = (dbPrescriptions.find(p => p.patientKey === selectedPatient)?.prescriptions ?? []).filter(pr => pr.bilanType === zoneType && inEp(pr.id))
                            // Le libellé "ATM"/custom vient d'une prescription de l'épisode
                            const rxForZone = rxListForZone[0]
                            const customZoneLabel = zoneType === 'generique' ? rxForZone?.customLabel : undefined
                            const zoneLabel = customZoneLabel ?? (ZONE_SECTION_LABELS[zoneType] ?? zoneType)
                            const closure = episode.closure
                            // Pool de l'épisode = tous les records de l'épisode (pas seulement ≤ closure, puisqu'ils sont déjà filtrés)
                            const zonePoolSize = zoneBilans.length + zoneIntermCount + zoneNotesCount
                            let consumedZone = 0
                            const rxZoneProgress = rxListForZone.map(r => {
                              const done = Math.min(r.nbSeances, Math.max(0, zonePoolSize - consumedZone))
                              consumedZone += r.nbSeances
                              return { ...r, done }
                            })
                            const zoneTotalDone = rxZoneProgress.reduce((s, r) => s + r.done, 0)
                            const zoneTotalPrescribed = rxZoneProgress.reduce((s, r) => s + r.nbSeances, 0)
                            const latestRxForZone = rxListForZone[rxListForZone.length - 1]
                            const isZoneEmpty = zoneBilans.length === 0 && zoneNotesCount === 0 && zoneIntermCount === 0
                            // Suffixe d'épisode quand plusieurs épisodes coexistent pour une même zone
                            const episodeSuffix = totalEpisodes > 1 ? ` · Épisode ${episode.idx + 1}` : ''
                            return (
                            <div key={`${zoneType}-ep${episode.idx}`} style={{ marginTop: '0.75rem' }}>
                            <SwipeToDelete
                              disabled={!zoneClosed}
                              onDelete={() => {
                                if (confirm(`Supprimer définitivement cet épisode clôturé de ${zoneLabel} ? Tous les bilans, séances, interm. et ordonnances de cet épisode seront perdus.`)) {
                                  deleteClosedEpisode(selectedPatient ?? '', zoneType as BilanType, episode)
                                }
                              }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0.75rem 0.85rem', borderRadius: 12, border: `1px solid ${zoneClosed ? c.borderSoft : `${c.primary}18`}`, background: zoneClosed ? '#f4f6f8' : 'var(--input-bg)', boxShadow: zoneClosed ? 'none' : '0 1px 6px rgba(0,0,0,0.05)' }}>
                              <div
                                onClick={toggleThisEpisode}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.4rem 0 0.4rem', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: zoneClosed ? c.surfaceMuted : 'var(--secondary)', color: zoneClosed ? c.textFaint : c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {zoneClosed ? (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6m11-11h-6M7 12H1"/></svg>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: c.text, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {zoneLabel}{episodeSuffix && <span style={{ fontWeight: 500, color: c.textMuted, fontSize: '0.78rem' }}>{episodeSuffix}</span>}
                                    {zoneClosed && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.15rem 0.5rem', borderRadius: 9999, background: c.successBg, color: c.success, fontSize: '0.68rem', fontWeight: 700 }}>
                                        PEC terminée
                                      </span>
                                    )}
                                    {zoneClosed && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation()
                                          if (confirm(`Reprendre la prise en charge ${zoneLabel} ? L'épisode sera rouvert avec tout son historique.`)) {
                                            reopenTreatment(selectedPatient ?? '', zoneType as BilanType, episode)
                                          }
                                        }}
                                        style={{ padding: '0.15rem 0.55rem', borderRadius: 9999, background: c.infoSoft, border: `1px solid ${c.infoBg}`, color: c.primaryLight, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Reprendre
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: c.textMuted, marginTop: 2, display: 'flex', gap: 12 }}>
                                    {zoneBilans.length > 0 && <span>{zoneBilans.length} bilan{zoneBilans.length > 1 ? 's' : ''}</span>}
                                    {zoneNotesCount > 0 && <span>{zoneNotesCount} séance{zoneNotesCount > 1 ? 's' : ''}</span>}
                                    {zoneIntermCount > 0 && <span>{zoneIntermCount} interm.</span>}
                                    {zoneBilans.length === 0 && zoneNotesCount === 0 && zoneIntermCount === 0 && <span>Aucune activité</span>}
                                  </div>
                                </div>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: zoneCollapsed ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </div>
                              {zoneClosed && zoneTotalPrescribed > 0 && (
                                <div style={{ padding: '0.55rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', margin: '0.2rem 0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      Prescription clôturée — {zoneTotalDone}/{zoneTotalPrescribed}
                                      {latestRxForZone?.prescripteur ? ` · Dr ${latestRxForZone.prescripteur}` : ''}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: '#166534' }}>{latestRxForZone?.datePrescription}</span>
                                  </div>
                                  <div style={{ height: 4, background: '#dcfce7', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${zoneTotalPrescribed > 0 ? Math.min(100, Math.round((zoneTotalDone / zoneTotalPrescribed) * 100)) : 0}%`, background: '#16a34a', borderRadius: 2 }} />
                                  </div>
                                </div>
                              )}
                              {zoneClosed && closure && (
                                <div style={{ fontSize: '0.72rem', color: '#166534', padding: '0 0.4rem', fontStyle: 'italic' }}>
                                  Clôturée le {new Date(closure.closedAt).toLocaleDateString('fr-FR')} — cette PEC est ignorée par les analyses IA des autres zones (résumée en antécédent seulement).
                                </div>
                              )}
                              {!zoneCollapsed && (<>
                              {(() => {
                                const initialBodyChart = (zoneBilans[0]?.bilanData?.douleur as Record<string, unknown> | undefined)?.bodyChart as string | undefined
                                return initialBodyChart ? <TreatmentBodyChart drawing={initialBodyChart} /> : null
                              })()}
                              <EvolutionChart
                                points={evolutionPoints}
                                title={`Évolution EVN — ${zoneLabel}`}
                                improvementPct={(() => {
                                  if (evolutionPoints.length < 2) return null
                                  const first = evolutionPoints[0].value
                                  const last = evolutionPoints[evolutionPoints.length - 1].value
                                  if (first === 0) return null
                                  return Math.round(((first - last) / first) * 100)
                                })()}
                              />
                              <ScoreEvolutionChart
                                bilans={zoneBilans}
                                intermediaires={dbIntermediaires.filter(r => r.patientKey === selectedPatient && (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))}
                              />
                              {zoneBilans.map((record, index) => {
                          const prevEvn = index > 0 ? zoneBilans[index - 1].evn : null
                          const currEvn = record.evn
                          const delta   = (prevEvn != null && currEvn != null) ? improvDelta(prevEvn, currEvn) : null
                          const dColor  = delta === null ? '' : delta > 0 ? '#166534' : delta < 0 ? '#881337' : '#94a3b8'

                          const incomplet = record.status === 'incomplet'
                          const bilanKey = `bilan-${record.id}`
                          const bilanOpen = openTimelineKey === bilanKey
                          return (
                            <div key={record.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${bilanOpen ? 'var(--border-soft)' : 'var(--info-bg)'}`, boxShadow: bilanOpen ? 'var(--shadow-sm)' : 'none', overflow: 'hidden' }}>
                              <div
                                role="button"
                                onClick={() => toggleTimeline(bilanKey)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.55rem 0.9rem', cursor: 'pointer' }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.88rem', lineHeight: 1.35 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Bilan n°{index + 1}</span>
                                    {editingLabelBilanId === record.id ? (
                                      <input
                                        autoFocus
                                        value={labelDraft}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setLabelDraft(e.target.value)}
                                        onBlur={() => {
                                          const trimmed = labelDraft.trim()
                                          setDb(prev => prev.map(r => r.id === record.id ? { ...r, customLabel: trimmed || undefined } : r))
                                          setEditingLabelBilanId(null)
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() }
                                          if (e.key === 'Escape') { setEditingLabelBilanId(null) }
                                        }}
                                        placeholder="Ex : tendinopathie coiffe des rotateurs"
                                        style={{ display: 'inline', marginLeft: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-main)', padding: '2px 6px', border: '1.5px solid var(--primary)', borderRadius: 6, outline: 'none', background: 'var(--surface)', width: 'calc(100% - 90px)' }}
                                      />
                                    ) : (
                                      <span
                                        onClick={e => { e.stopPropagation(); setEditingLabelBilanId(record.id); setLabelDraft(record.customLabel ?? '') }}
                                        title={record.customLabel ? 'Cliquer pour modifier' : 'Cliquer pour ajouter un titre'}
                                        style={{ fontSize: '0.78rem', fontWeight: 500, color: record.customLabel ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: record.customLabel ? 'normal' : 'italic', cursor: 'pointer' }}
                                      >
                                        {record.customLabel ? <>&nbsp;: {record.customLabel}</> : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            titre
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', marginTop: 1 }}>
                                    {record.dateBilan}{currEvn != null ? ` · EVN ${currEvn}` : ''}{!showSections && record.zone ? ` · ${record.zone}` : ''}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  {incomplet ? (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#991b1b' }}>Incomplet</span>
                                  ) : delta !== null ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.76rem', color: dColor, letterSpacing: '-0.01em' }}>
                                      {delta > 0 ? (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                      ) : delta < 0 ? (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      ) : (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                      )}
                                      {Math.abs(delta)}%
                                    </span>
                                  ) : null}
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--info-border-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: bilanOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                              </div>
                              {bilanOpen && (incomplet ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                  <button
                                    style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                      setSelectedBodyZone(record.zone ?? null)
                                      setCurrentBilanId(record.id)
                                      setCurrentBilanDataOverride(record.bilanData ?? null)
                                      setBilanNotes(record.notes ?? '')
                                      setSilhouetteData(record.silhouetteData ?? {})
                                      setBilanDocuments(record.documents ?? [])
                                      setBilanZoneBackStep('database')
                                      setStep('bilan_zone')
                                    }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 13 20 8 15 3"/><path d="M4 20v-3a5 5 0 0 1 5-5h11"/></svg>
                                    Reprendre le bilan
                                  </button>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                    <button onClick={() => setDeletingBilanId(record.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                  {record.analyseIA && (
                                    <div style={{ marginBottom: 2 }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'var(--info-soft)', color: 'var(--primary)', border: '1px solid var(--border-soft)' }}>Analysé</span>
                                    </div>
                                  )}
                                  {/* Rangée 1 : Bilan PDF + Analyse */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.82rem', cursor: exportingRecordId === record.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: exportingRecordId === record.id ? 0.75 : 1 }}
                                      onClick={() => exportBilanFromRecord(record)}
                                      disabled={exportingRecordId === record.id}>
                                      {exportingRecordId === record.id ? (
                                        <span className="spinner-sm" />
                                      ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                        </svg>
                                      )}
                                      Bilan PDF
                                    </button>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: 'var(--info-soft)', border: '1.5px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                        setSelectedBodyZone(record.zone ?? null)
                                        setCurrentBilanId(record.id)
                                        setCurrentAnalyseIA(record.analyseIA ?? null)
                                        setCurrentBilanDataOverride(record.bilanData ?? null)
                                        setBilanDocuments(record.documents ?? [])
                                        setStep('analyse_ia')
                                      }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                      </svg>
                                      Analyser
                                    </button>
                                  </div>
                                  {/* Rangée 2 : Fiche d'exercices */}
                                  <button
                                    style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                      setSelectedBodyZone(record.zone ?? null)
                                      setCurrentBilanId(record.id)
                                      setCurrentAnalyseIA(record.analyseIA ?? null)
                                      setCurrentBilanDataOverride(record.bilanData ?? null)
                                      setFicheBackStep('database')
                                      setStep('fiche_exercice')
                                    }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                    </svg>
                                    Fiche d'exercices
                                  </button>
                                  {/* Rangée 3 : Résumé / Modifier / Supprimer — liens discrets */}
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                    <button
                                      onClick={() => setResumeBilan({ record, bilanNum: index + 1 })}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                      Résumé
                                    </button>
                                    <button
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                        setSelectedBodyZone(record.zone ?? null)
                                        setCurrentBilanId(record.id)
                                        setCurrentBilanDataOverride(record.bilanData ?? null)
                                        setBilanNotes(record.notes ?? '')
                                        setSilhouetteData(record.silhouetteData ?? {})
                                        setBilanDocuments(record.documents ?? [])
                                        setBilanZoneBackStep('database')
                                        setStep('bilan_zone')
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      Modifier
                                    </button>
                                    <button onClick={() => setDeletingBilanId(record.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                              {(() => {
                                // ── Timeline chronologique (bilans intermédiaires + notes de séance de cet épisode) ──
                                const zoneInters = getPatientIntermediaires(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))
                                const zoneNotes = dbNotes.filter(n => n.patientKey === selectedPatient && (n.bilanType ?? getBilanType(n.zone ?? '')) === zoneType && inEp(n.id)).sort((a, b) => {
                                  const ta = parseFrDate(a.dateSeance), tb = parseFrDate(b.dateSeance)
                                  if (ta !== tb) return ta - tb
                                  return a.id - b.id
                                })
                                if (zoneInters.length === 0 && zoneNotes.length === 0) return null
                                // Index par id pour afficher "Intermédiaire N°X" (position chronologique)
                                const intermIndexById = new Map<number, number>()
                                zoneInters.forEach((r, i) => intermIndexById.set(r.id, i))
                                // Timeline mêlée triée par date croissante
                                type InterItem = { kind: 'interm'; d: number; rec: BilanIntermediaireRecord }
                                type NoteItem = { kind: 'note'; d: number; rec: NoteSeanceRecord }
                                const timeline: Array<InterItem | NoteItem> = [
                                  ...zoneInters.map(r => ({ kind: 'interm' as const, d: parseFrDate(r.dateBilan), rec: r })),
                                  ...zoneNotes.map(n => ({ kind: 'note' as const, d: parseFrDate(n.dateSeance), rec: n })),
                                ].sort((a, b) => a.d - b.d)
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {timeline.map(item => {
                                      if (item.kind === 'note') {
                                        const note = item.rec
                                        const ZONE_LABELS: Record<string, string> = { epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche', cervical: 'Cervical', lombaire: 'Lombaire', generique: 'Général', geriatrique: 'Gériatrie', 'drainage-lymphatique': 'Drainage Lymphatique' }
                                        const zt = note.bilanType ?? getBilanType(note.zone ?? '')
                                        const noteKey = `note-${note.id}`
                                        const noteOpen = openTimelineKey === noteKey
                                        return (
                                          <div key={`note-${note.id}`} style={{ background: 'var(--surface)', borderRadius: 12, border: `1.5px solid ${noteOpen ? '#ddd6fe' : '#ede9fe'}`, boxShadow: noteOpen ? '0 1px 3px rgba(109,40,217,0.06)' : 'none', overflow: 'hidden' }}>
                                            <div
                                              role="button"
                                              onClick={() => toggleTimeline(noteKey)}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.55rem 0.75rem', cursor: 'pointer' }}
                                            >
                                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#5b21b6' }}>Séance n°{note.numSeance}</span>
                                                <span style={{ fontSize: '0.72rem', color: '#6d28d9' }}>{note.dateSeance}</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                {note.data.eva != null && note.data.eva !== '' && <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: '#ede9fe', color: '#6d28d9' }}>EVA {note.data.eva}</span>}
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: noteOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                              </div>
                                            </div>
                                            {noteOpen && (
                                            <div style={{ padding: '0 0.75rem 0.75rem' }}>
                                            {(note.data.evolution || note.data.tolerance) && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                              {note.data.evolution && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.evolution === 'Amélioré' ? '#dcfce7' : note.data.evolution === 'Aggravé' ? '#fef2f2' : '#f3f4f6', color: note.data.evolution === 'Amélioré' ? '#166534' : note.data.evolution === 'Aggravé' ? '#881337' : '#6b7280' }}>{note.data.evolution}</span>}
                                              {note.data.tolerance && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.tolerance === 'Bien toléré' ? '#dcfce7' : '#fffbeb', color: note.data.tolerance === 'Bien toléré' ? '#166534' : '#d97706' }}>{note.data.tolerance}</span>}
                                            </div>
                                            )}
                                            {(() => {
                                              const hasDetail = note.data.interventions.length > 0 || note.data.detailDosage || note.data.noteSubjective || note.data.toleranceDetail || note.data.prochaineEtape.length > 0 || note.data.notePlan
                                              if (!hasDetail) return null
                                              const isDetailOpen = openNoteDetailIds.has(note.id)
                                              return (
                                                <div style={{ marginBottom: 8 }}>
                                                  <button
                                                    onClick={() => setOpenNoteDetailIds(prev => { const next = new Set(prev); if (next.has(note.id)) next.delete(note.id); else next.add(note.id); return next })}
                                                    style={{ width: '100%', padding: '0.3rem 0.7rem', borderRadius: isDetailOpen ? '8px 8px 0 0' : 8, background: '#f5f3ff', border: '1px solid #ede9fe', color: '#7c3aed', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Détails séance</span>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDetailOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                                  </button>
                                                  {isDetailOpen && (
                                                    <div style={{ background: '#f5f3ff', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: '#5b21b6', lineHeight: 1.5, borderTop: '1px solid #ede9fe' }}>
                                                      {note.data.interventions.length > 0 && (<div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Traitement :</span> {note.data.interventions.join(', ')}</div>)}
                                                      {note.data.detailDosage && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Dosage :</span> {note.data.detailDosage}</div>}
                                                      {note.data.noteSubjective && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Ressenti :</span> {note.data.noteSubjective}</div>}
                                                      {note.data.toleranceDetail && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Tolérance :</span> {note.data.toleranceDetail}</div>}
                                                      {note.data.prochaineEtape.length > 0 && (<div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Prochaine étape :</span> {note.data.prochaineEtape.join(', ')}</div>)}
                                                      {note.data.notePlan && <div><span style={{ fontWeight: 700 }}>Note :</span> {note.data.notePlan}</div>}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                            {note.analyseIA && (() => {
                                              const isOpen = openAnalyseNoteIds.has(note.id)
                                              return (
                                                <div style={{ marginBottom: 8 }}>
                                                  <button
                                                    onClick={() => setOpenAnalyseNoteIds(prev => { const next = new Set(prev); if (next.has(note.id)) next.delete(note.id); else next.add(note.id); return next })}
                                                    style={{ width: '100%', padding: '0.4rem 0.7rem', borderRadius: isOpen ? '8px 8px 0 0' : 8, background: 'var(--info-soft)', border: '1px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Analyse</span>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                                  </button>
                                                  {isOpen && (
                                                    <div style={{ background: 'var(--info-soft)', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: 'var(--primary)', lineHeight: 1.5, borderLeft: '3px solid var(--primary-light)', borderTop: 'none' }}>
                                                      <div style={{ marginBottom: 3 }}>{note.analyseIA.resume}</div>
                                                      <div style={{ marginBottom: 3, fontSize: '0.72rem' }}>{note.analyseIA.evolution}</div>
                                                      {note.analyseIA.vigilance.length > 0 && (<div style={{ color: '#dc2626', fontSize: '0.72rem', marginBottom: 3 }}>Vigilance : {note.analyseIA.vigilance.join(' / ')}</div>)}
                                                      <div style={{ fontWeight: 600, fontSize: '0.72rem' }}>Focus : {note.analyseIA.focus}</div>
                                                      {note.analyseIA.conseil && (<div style={{ marginTop: 4, padding: '0.4rem 0.55rem', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.72rem' }}><span style={{ fontWeight: 700 }}>Conseil :</span> {note.analyseIA.conseil}</div>)}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: 'var(--info-soft)', border: '1.5px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={async () => {
                                                    if (!apiKey) { showToast('Clé API requise', 'error'); return }
                                                    showToast('Analyse en cours...', 'success')
                                                    try {
                                                      const patKey = note.patientKey
                                                      const allNotes = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === zt).sort((a, b) => a.id - b.id)
                                                      const allBilans = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)
                                                      const allInters = dbIntermediaires.filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)
                                                      const bilansStr = allBilans.map(b => {
                                                        const d = b.bilanData?.douleur as Record<string, unknown> | undefined
                                                        const sc = b.bilanData?.scores as Record<string, unknown> | undefined
                                                        const lines = [`--- Bilan initial ${b.dateBilan} ---`, `EVN : ${b.evn ?? '?'}/10`]
                                                        if (d?.douleurType) lines.push(`Type douleur : ${d.douleurType} | Évolution : ${d.situation ?? 'N/R'} | Nocturne : ${d.douleurNocturne ?? 'N/R'}`)
                                                        if (sc && Object.keys(sc).length > 0) lines.push(`Scores : ${JSON.stringify(sc)}`)
                                                        if (b.analyseIA) lines.push(`Diagnostic IA : ${b.analyseIA.diagnostic.titre} — ${b.analyseIA.diagnostic.description}`)
                                                        if (b.ficheExercice?.markdown) { const md = b.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const intersStr = allInters.map(r => {
                                                        const tc2 = (r.data?.troncCommun as Record<string, unknown>) ?? {}
                                                        const evn2 = (tc2.evn as Record<string, unknown>) ?? {}
                                                        const lines = [`--- Bilan intermédiaire ${r.dateBilan} ---`, `EVN pire : ${evn2.pireActuel ?? '?'}/10 (initial: ${evn2.pireInitial ?? '?'}) | Évolution globale : ${tc2.evolutionGlobale ?? 'N/R'}`]
                                                        if (r.analyseIA) lines.push(`Diagnostic IA : ${r.analyseIA.noteDiagnostique.titre} — ${r.analyseIA.noteDiagnostique.evolution}`)
                                                        if (r.ficheExercice?.markdown) { const md = r.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const notesStr = allNotes.map(n => {
                                                        const lines = [`--- Séance n°${n.numSeance} (${n.dateSeance}) ---`,
                                                          `EVA : ${n.data.eva}/10 | Observance : ${n.data.observance} | Tolérance : ${n.data.tolerance}${n.data.toleranceDetail ? ` (${n.data.toleranceDetail})` : ''}`,
                                                          `Évolution : ${n.data.evolution}`,
                                                          `Interventions : ${n.data.interventions.join(', ')}`]
                                                        if (n.data.prochaineEtape?.length) lines.push(`Prochaines étapes : ${n.data.prochaineEtape.join(', ')}`)
                                                        if (n.data.noteSubjective) lines.push(`Ressenti patient : ${n.data.noteSubjective}`)
                                                        if (n.analyseIA) {
                                                          if (n.analyseIA.resume) lines.push(`Analyse : ${n.analyseIA.resume}`)
                                                          if (n.analyseIA.focus) lines.push(`Focus : ${n.analyseIA.focus}`)
                                                          if (n.analyseIA.conseil) lines.push(`Conseil : ${n.analyseIA.conseil}`)
                                                        }
                                                        if (n.ficheExercice?.markdown) { const md = n.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const historiqueStr = [bilansStr, intersStr, notesStr].filter(Boolean).join('\n\n')
                                                      const raw = await callClaudeSecure({
                                                        apiKey,
                                                        systemPrompt: 'Tu es un kinésithérapeute expert. Analyse la séance actuelle dans le contexte de tout l\'historique COMPLET du patient (bilans, bilans intermédiaires, séances précédentes, analyses IA, exercices prescrits). Sois concis. Réponds UNIQUEMENT en JSON valide.',
                                                        userPrompt: `HISTORIQUE COMPLET DU PATIENT (${ZONE_LABELS[zt] ?? zt}) :\n${historiqueStr}\n\nSÉANCE ACTUELLE (n°${note.numSeance}) :\nEVA : ${note.data.eva}/10\nÉvolution : ${note.data.evolution}\nObservance : ${note.data.observance}\nInterventions : ${note.data.interventions.join(', ')}\nDosage : ${note.data.detailDosage}\nTolérance : ${note.data.tolerance} ${note.data.toleranceDetail}\nRessenti : ${note.data.noteSubjective}\nProchaine étape : ${note.data.prochaineEtape.join(', ')}\nNote : ${note.data.notePlan}\n\nRéponds en JSON :\n{"resume":"1-2 phrases résumant la séance","evolution":"1 phrase sur la tendance globale de l\'évolution","vigilance":["point de vigilance 1","point 2 si pertinent"],"focus":"1 phrase sur quoi se focaliser à la prochaine séance","conseil":"1-2 phrases de conseil IA basé sur la direction de la symptomatologie et l\'historique — concret et actionnable"}`,
                                                        maxOutputTokens: 2048,
                                                        jsonMode: true,
                                                        patient: { nom: note.nom, prenom: note.prenom, patientKey: note.patientKey },
                                                        category: 'note_seance_mini',
                                                        onAudit: recordAIAudit,
                                                      })
                                                      const parsed = analyseSeanceMiniSchema.parse(JSON.parse(raw))
                                                      const mini = { generatedAt: new Date().toISOString(), resume: stripMd(parsed.resume), evolution: stripMd(parsed.evolution), vigilance: parsed.vigilance.map(stripMd), focus: stripMd(parsed.focus), conseil: stripMd(parsed.conseil ?? '') }
                                                      setDbNotes(prev => prev.map(n => n.id === note.id ? { ...n, analyseIA: mini } : n))
                                                      showToast('Analyse générée', 'success')
                                                    } catch { showToast('Erreur analyse', 'error') }
                                                  }}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                                  </svg>
                                                  {note.analyseIA ? 'Relancer' : 'Analyser'}
                                                </button>
                                                <button
                                                  style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: note.nom, prenom: note.prenom, dateNaissance: note.dateNaissance }))
                                                    const patKey = note.patientKey
                                                    const bt = note.bilanType ?? getBilanType(note.zone ?? '')
                                                    const allNotesForZone = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt).sort((a, b) => a.id - b.id)
                                                    const allBilansForZone = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                    const allIntersForZone = dbIntermediaires.filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                    const historiqueStr = [
                                                      ...allBilansForZone.map(b => `Bilan initial ${b.dateBilan} — EVN ${b.evn ?? '?'}/10`),
                                                      ...allIntersForZone.map(r => { const tc = (r.data?.troncCommun as Record<string, unknown>)?.evn as Record<string, unknown> ?? {}; return `Bilan intermédiaire ${r.dateBilan} — EVN ${tc.pireActuel ?? '?'}/10` }),
                                                      ...allNotesForZone.map(n => `Séance n°${n.numSeance} ${n.dateSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution} — ${n.data.interventions.join(', ')}`),
                                                    ].join('\n')
                                                    setFicheExerciceContextOverride({
                                                      zone: note.zone ?? '',
                                                      bilanData: {},
                                                      notesLibres: `SÉANCE n°${note.numSeance} du ${note.dateSeance}\nEVA: ${note.data.eva}/10 — ${note.data.evolution}\nInterventions: ${note.data.interventions.join(', ')}\nDosage: ${note.data.detailDosage}\nTolérance: ${note.data.tolerance} ${note.data.toleranceDetail}\nRessenti: ${note.data.noteSubjective}\n\nHistorique complet du patient:\n${historiqueStr}`,
                                                    })
                                                    setFicheExerciceSource({ type: 'note', id: note.id })
                                                    setSelectedBodyZone(note.zone ?? null)
                                                    setFicheBackStep('database')
                                                    setStep('fiche_exercice')
                                                  }}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                  </svg>
                                                  Fiche exercices
                                                </button>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: note.nom, prenom: note.prenom, dateNaissance: note.dateNaissance }))
                                                    setNoteSeanceZone(note.zone ?? null)
                                                    setCurrentNoteSeanceId(note.id)
                                                    setCurrentNoteSeanceData(note.data)
                                                    setStep('note_seance')
                                                  }}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                  Modifier
                                                </button>
                                                <button onClick={() => setDeletingNoteSeanceId(note.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </div>
                                            </div>
                                            )}
                                          </div>
                                        )
                                      }
                                      // kind === 'interm'
                                      const rec = item.rec
                                      const idx = intermIndexById.get(rec.id) ?? 0
                                      return (() => {
                                      // Score d'amélioration : EVN pireActuel vs pireInitial dans troncCommun
                                      const tc = (rec.data?.troncCommun as Record<string, unknown>) ?? {}
                                      const evnInter = (tc.evn as Record<string, unknown>) ?? {}
                                      const evnActNum  = parseFloat(String(evnInter.pireActuel  ?? ''))
                                      const evnInitNum = parseFloat(String(evnInter.pireInitial ?? ''))
                                      // Fallback : comparer avec EVN du premier bilan initial de la zone
                                      const firstInitial = zoneBilans.find(b => b.evn != null)
                                      const baseEvn = !isNaN(evnInitNum) ? evnInitNum : (firstInitial?.evn ?? null)
                                      const score = (!isNaN(evnActNum) && baseEvn != null && baseEvn > 0)
                                        ? improvDelta(baseEvn, evnActNum) : null
                                      const sColor = score === null ? '#94a3b8' : score > 0 ? '#166534' : score < 0 ? '#881337' : '#94a3b8'

                                      const intermKey = `interm-${rec.id}`
                                      const intermOpen = openTimelineKey === intermKey
                                      return (
                                      <div key={rec.id} style={{ background: 'var(--surface)', border: `1.5px solid ${intermOpen ? '#fdba74' : '#fed7aa'}`, borderRadius: 'var(--radius-lg)', boxShadow: intermOpen ? 'var(--shadow-sm)' : 'none', overflow: 'hidden' }}>
                                        <div
                                          role="button"
                                          onClick={() => toggleTimeline(intermKey)}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.55rem 0.9rem', cursor: 'pointer' }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem' }}>Intermédiaire n°{idx + 1}</span>
                                              {rec.status === 'incomplet' && <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#991b1b' }}>Incomplet</span>}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#c2410c', marginTop: 1 }}>{rec.dateBilan}</div>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {score !== null && (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.76rem', color: sColor, letterSpacing: '-0.01em' }}>
                                                {score > 0 ? (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                                ) : score < 0 ? (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                ) : (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                )}
                                                {Math.abs(score)}%
                                              </span>
                                            )}
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: intermOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                          </div>
                                        </div>
                                        {intermOpen && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                          {rec.status === 'incomplet' ? (
                                            <>
                                              <button
                                                style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, #ea580c, #c2410c)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                                onClick={() => {
                                                  setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                  setBilanIntermediaireZone(rec.zone ?? null)
                                                  setCurrentBilanIntermediaireId(rec.id)
                                                  setCurrentBilanIntermediaireData(rec.data ?? null)
                                                  setStep('bilan_intermediaire')
                                                }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 13 20 8 15 3"/><path d="M4 20v-3a5 5 0 0 1 5-5h11"/></svg>
                                                Reprendre le bilan intermédiaire
                                              </button>
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button onClick={() => setDeletingIntermediaireId(rec.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              {/* Rangée 1 : Bilan PDF + Note diag */}
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  style={{ flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: exportingRecordId === rec.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: exportingRecordId === rec.id ? 0.75 : 1 }}
                                                  onClick={() => {
                                                    // Exporte le bilan intermédiaire comme un BilanRecord pour réutiliser exportBilanFromRecord
                                                    exportBilanFromRecord({
                                                      id: rec.id, nom: rec.nom, prenom: rec.prenom,
                                                      dateNaissance: rec.dateNaissance, dateBilan: rec.dateBilan,
                                                      zoneCount: 1, zone: rec.zone, bilanType: rec.bilanType,
                                                      bilanData: rec.data, notes: rec.notes, status: rec.status,
                                                      avatarBg: rec.avatarBg,
                                                    } as BilanRecord, true)
                                                  }}
                                                  disabled={exportingRecordId === rec.id}>
                                                  {exportingRecordId === rec.id ? (
                                                    <span className="spinner-sm" />
                                                  ) : (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                    </svg>
                                                  )}
                                                  Bilan PDF
                                                </button>
                                                <button
                                                  style={{ flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#92400e', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={() => openNoteIntermediaire(rec)}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                                  </svg>
                                                  Note diag. IA
                                                </button>
                                              </div>
                                              {/* Rangée 2 : Fiche d'exercices */}
                                              <button
                                                style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                                onClick={() => {
                                                  setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                  // Build context from intermediaire + historique
                                                  const patKey = rec.patientKey
                                                  const bt = rec.bilanType ?? getBilanType(rec.zone ?? '')
                                                  const allNotes = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt)
                                                  const allBilans = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                  const historiqueStr = [
                                                    ...allBilans.map(b => `Bilan initial ${b.dateBilan} — EVN ${b.evn ?? '?'}/10`),
                                                    ...allNotes.map(n => `Séance n°${n.numSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution} — ${n.data.interventions.join(', ')}`),
                                                  ].join('\n')
                                                  const tc = (rec.data?.troncCommun as Record<string, unknown>) ?? {}
                                                  const evnData = (tc.evn as Record<string, unknown>) ?? {}
                                                  setFicheExerciceContextOverride({
                                                    zone: rec.zone ?? '',
                                                    bilanData: rec.data ?? {},
                                                    notesLibres: `BILAN INTERMÉDIAIRE — EVN actuelle: ${evnData.pireActuel ?? '?'}/10 (initiale: ${evnData.pireInitial ?? '?'}/10)\nHistorique du patient:\n${historiqueStr}`,
                                                  })
                                                  setFicheExerciceSource({ type: 'intermediaire', id: rec.id })
                                                  setSelectedBodyZone(rec.zone ?? null)
                                                  setFicheBackStep('database')
                                                  setStep('fiche_exercice')
                                                }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                </svg>
                                                Fiche d'exercices
                                              </button>
                                              {/* Rangée 3 : Modifier / Supprimer — liens discrets */}
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                    setBilanIntermediaireZone(rec.zone ?? null)
                                                    setCurrentBilanIntermediaireId(rec.id)
                                                    setCurrentBilanIntermediaireData(rec.data ?? null)
                                                    setStep('bilan_intermediaire')
                                                  }}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                  Modifier
                                                </button>
                                                <button onClick={() => setDeletingIntermediaireId(rec.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                        )}
                                      </div>
                                      )
                                      })()
                                    })}
                                  </div>
                                )
                              })()}
                              {/* ── Actions par zone ────────────────────── */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '0.35rem' }}>
                                {(zoneBilans.filter(r => r.status === 'complet').length + zoneIntermCount + zoneNotesCount) >= 2 && (
                                  <button
                                    onClick={() => {
                                      const firstRec = zoneBilans[0] ?? allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType) ?? allPatientRecords[0]
                                      setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                                      setEvolutionZoneType(zoneType as BilanType)
                                      setStep('evolution_ia')
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(30,58,138,0.2)' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                    Rapport d'évolution — {zoneLabel}
                                  </button>
                                )}
                                {isZoneEmpty ? (
                                  <button
                                    onClick={() => {
                                      const firstRec = allPatientRecords[0]
                                      setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                                      setPatientMode('existing')
                                      setSelectedBodyZone(DEFAULT_ZONE_FOR_BILAN[zoneType as BilanType] ?? null)
                                      setBilanZoneBackStep('identity')
                                      setStep('identity')
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Nouveau bilan {zoneLabel}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Clôturer la prise en charge ${zoneLabel} ? Les futures analyses d'autres zones ne verront cette PEC que comme un antécédent résumé.`)) {
                                        closeTreatment(selectedPatient ?? '', zoneType as BilanType, zoneBilans[0]?.zone)
                                      }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    Clôturer la PEC {zoneLabel}
                                  </button>
                                )}
                              </div>
                              </>)}
                            </div>
                            </SwipeToDelete>
                            </div>
                          )
                          })
                        })()}
                        {/* ── Documents ────────────────────── */}
                        <DossierDocuments
                          patientKey={selectedPatient ?? ''}
                          bilans={bilans}
                          standaloneDocs={dbPatientDocs.filter(d => d.patientKey === selectedPatient)}
                          onRename={(target, newName) => {
                            if (target.kind === 'bilan') {
                              setDb(prev => prev.map(r => {
                                if (r.id !== target.bilanId || !r.documents) return r
                                const docs = r.documents.map((d, i) => i === target.docIndex ? { ...d, name: newName } : d)
                                return { ...r, documents: docs }
                              }))
                            } else {
                              setDbPatientDocs(prev => prev.map(d => d.id === target.docId ? { ...d, name: newName } : d))
                            }
                          }}
                          onDelete={(docId) => {
                            setDbPatientDocs(prev => prev.filter(d => d.id !== docId))
                          }}
                          onAddRaw={async (dataUrl, name, mimeType) => {
                            if (mimeType.startsWith('image/')) {
                              setPatientDocMaskingQueue(prev => [...prev, { dataUrl, name, mimeType }])
                            } else if (mimeType === 'application/pdf') {
                              try {
                                const pages = await pdfToImages(dataUrl)
                                const baseName = name.replace(/\.pdf$/i, '')
                                for (let i = 0; i < pages.length; i++) {
                                  setPatientDocMaskingQueue(prev => [...prev, {
                                    dataUrl: pages[i],
                                    name: pages.length === 1 ? `${baseName}.png` : `${baseName} (p${i + 1}).png`,
                                    mimeType: 'image/png',
                                  }])
                                }
                              } catch {
                                const base64 = dataUrl.split(',')[1] ?? dataUrl
                                const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                                setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name, mimeType, data: base64, addedAt: new Date().toISOString() }])
                              }
                            } else {
                              const base64 = dataUrl.split(',')[1] ?? dataUrl
                              const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                              setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name, mimeType, data: base64, addedAt: new Date().toISOString() }])
                            }
                          }}
                          onRemask={(docId) => {
                            const doc = dbPatientDocs.find(d => d.id === docId)
                            if (!doc || !doc.originalData) return
                            const dataUrl = `data:${doc.mimeType};base64,${doc.originalData}`
                            setPatientDocMaskingQueue(prev => [...prev, { dataUrl, name: doc.name, mimeType: doc.mimeType }])
                            setDbPatientDocs(prev => prev.filter(d => d.id !== docId))
                          }}
                        />

                        {/* ── Supprimer le patient ────────────── */}
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            onClick={() => setDeletingPatientKey(selectedPatient)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'transparent', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            Supprimer ce patient
                          </button>
                        </div>
                      </div>

                      <ConsultationChooser
                        open={consultationChooserOpen}
                        onClose={() => setConsultationChooserOpen(false)}
                        zones={zonesForPicker}
                        hasAnyBilan={hasAnyBilanForPicker}
                        onPickSeance={() => {
                          const activeZones = zonesForPicker
                          if (activeZones.length <= 1) {
                            const bt = (activeZones[0]?.bilanType ?? getBilanType(bilans[0]?.zone ?? '')) as BilanType
                            const firstRec = allPatientRecords[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            const z = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)?.zone ?? DEFAULT_ZONE_FOR_BILAN[bt] ?? ''
                            setNoteSeanceZone(z)
                            setCurrentNoteSeanceId(null)
                            setCurrentNoteSeanceData(null)
                            setStep('note_seance')
                          } else {
                            setLetterZonePicker({ action: 'seance' })
                          }
                        }}
                        onPickIntermediaire={() => {
                          const activeWithBilans = zonesForPicker.filter(z => z.hasBilans)
                          if (activeWithBilans.length <= 1) {
                            const bt = (activeWithBilans[0]?.bilanType ?? getBilanType(bilans[0]?.zone ?? '')) as BilanType
                            const firstRec = allPatientRecords[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            const patKey = selectedPatient ?? ''
                            const z = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)?.zone ?? DEFAULT_ZONE_FOR_BILAN[bt] ?? ''
                            setBilanIntermediaireZone(z)
                            setCurrentBilanIntermediaireId(null)
                            setCurrentBilanIntermediaireData(getIntermediairePreFill(patKey, z))
                            setStep('bilan_intermediaire')
                          } else {
                            setLetterZonePicker({ action: 'intermediaire' })
                          }
                        }}
                        onPickNouveauBilan={() => {
                          const firstRec = allPatientRecords[0]
                          setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                          setPatientMode('existing')
                          setSelectedBodyZone(null)
                          setBilanZoneBackStep('identity')
                          setStep('identity')
                        }}
                        onPickBilanSortie={() => {
                          const firstRec = allPatientRecords[0]
                          setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                          const activeTypes = getPatientBilanTypes(selectedPatient ?? '').filter(t => !isTreatmentClosed(selectedPatient ?? '', t))
                          if (activeTypes.length <= 1) {
                            setSelectedBodyZone(bilans[bilans.length - 1]?.zone ?? null)
                            setStep('bilan_sortie')
                          } else {
                            setLetterZonePicker({ action: 'bilan_sortie' })
                          }
                        }}
                        onPickCourrier={() => {
                          const activeTypes = getPatientBilanTypes(selectedPatient ?? '').filter(t => !isTreatmentClosed(selectedPatient ?? '', t))
                          if (activeTypes.length <= 1) {
                            const soleZone = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === activeTypes[0])?.zone ?? null
                            setSelectedBodyZone(soleZone)
                            setStep('letter')
                          } else {
                            setLetterZonePicker({ action: 'letter' })
                          }
                        }}
                      />
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </div>
  )
}
