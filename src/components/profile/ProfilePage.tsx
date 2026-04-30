import { useRef, useState, type CSSProperties } from 'react'
import type { ProfileData } from '../../types'
import type { ToastType } from '../../hooks/useToast'

type ProfilePageProps = {
  profile: ProfileData
  onSave: (next: ProfileData) => void
  onBack: () => void
  onExportData: () => void
  onImportFile: (file: File) => void
  letterAuditCount: number
  aiAuditCount: number
  aiAuditWithDocsCount: number
  aiAuditSuspiciousCount: number
  onExportRegister: () => void
  onShowToast: (message: string, type?: ToastType) => void
}

const SPECIALITES = ['Thérapie manuelle', 'McKenzie (MDT)', 'Sport', 'Pédiatrie', 'Neurologie', 'Vestibulaire', 'Périnéologie', 'Respiratoire', 'Rhumatologie', 'Gériatrie', 'Orthopédie']
const TECHNIQUES = ['Dry needling', 'Mulligan', 'Maitland', 'Cupping', 'Taping / K-Tape', 'PNF (Kabat)', 'Chaînes musculaires (GDS/Busquet)', 'Éducation neurosciences douleur', 'Crochetage / IASTM', 'Drainage lymphatique', 'Trigger points', 'Ventouses', 'Stretching global actif']
const EQUIPEMENTS = ['Ondes de choc', 'TENS', 'Tecarthérapie (Winback/Indiba)', 'Ultrasons', 'Laser', 'Isocinétisme', 'Plateforme proprioceptive', 'Huber / LPG', 'Pressothérapie', 'Électrostimulation', 'Cryothérapie', 'Traction cervicale/lombaire', 'Vélo / Elliptique', 'Presse']

const RGPD_NOTICE = `Dans le cadre de votre prise en charge, des outils informatiques incluant des modèles d'intelligence artificielle peuvent être utilisés pour assister la rédaction de vos documents médicaux (courriers aux médecins, synthèses, comptes rendus).

Aucune donnée personnelle identifiante vous concernant (nom, prénom, date de naissance, coordonnées) n'est transmise à ces outils. Seules des informations médicales anonymisées (âge, pathologie, données cliniques) le sont, et uniquement à des fins d'aide à la rédaction. Le contenu final est systématiquement relu et validé par votre thérapeute avant tout envoi.

Vos données médicales sont stockées exclusivement sur l'équipement informatique du praticien, ne sont jamais partagées avec des tiers en dehors du strict cadre du parcours de soins, et restent sous le contrôle du thérapeute qui en est le responsable du traitement au sens du RGPD.

Pour toute question, exercer vos droits (accès, rectification, effacement) ou signaler une préoccupation, adressez-vous directement à votre thérapeute.`

const sectionTitle: CSSProperties = { fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', marginBottom: 8 }

const chipStyle = (active: boolean): CSSProperties => ({
  padding: '0.45rem 0.75rem',
  borderRadius: 'var(--radius-full)',
  border: active ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
  background: active ? 'var(--info-soft)' : 'transparent',
  color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
  fontWeight: active ? 600 : 400,
  fontSize: '0.78rem',
  cursor: 'pointer',
  transition: 'all 0.18s',
})

function toggleInList<T>(list: T[] | undefined, value: T): T[] {
  const arr = list ?? []
  return arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]
}

export function ProfilePage({
  profile,
  onSave,
  onBack,
  onExportData,
  onImportFile,
  letterAuditCount,
  aiAuditCount,
  aiAuditWithDocsCount,
  aiAuditSuspiciousCount,
  onExportRegister,
  onShowToast,
}: ProfilePageProps) {
  const [draft, setDraft] = useState<ProfileData>(profile)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setDraft(p => ({ ...p, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setDraft(p => ({ ...p, signatureImage: reader.result as string }))
    reader.readAsDataURL(f)
  }

  const handleImportPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onImportFile(file)
    e.target.value = ''
  }

  const handleCopyNotice = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(RGPD_NOTICE).then(() => onShowToast('Mention copiée', 'success'))
    }
  }

  const handleSubmit = () => {
    onSave(draft)
  }

  const totalAuditCount = letterAuditCount + aiAuditCount

  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Modifier le profil</h2>
        <div style={{ width: 24 }} />
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>
        <div className="fade-in">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div onClick={() => photoInputRef.current?.click()}
              style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--shadow-lg)', background: draft.photo ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {draft.photo
                ? <img src={draft.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profil" />
                : <span style={{ fontSize: '2.2rem', fontWeight: 700, color: 'white' }}>{(draft.nom || draft.prenom || 'W')[0]}</span>}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Appuyez pour changer la photo</span>
          </div>

          <div className="form-group">
            <label>Prénom / Nom affiché</label>
            <input type="text" className="input-luxe" value={draft.nom}
              onChange={e => setDraft(p => ({ ...p, nom: e.target.value }))} placeholder="Renseignez votre nom" />
          </div>

          <div className="form-group">
            <label>Profession</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {(['Kinésithérapeute', 'Physiothérapeute'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDraft(p => ({ ...p, profession: opt }))}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: draft.profession === opt ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
                    background: draft.profession === opt ? 'var(--info-soft)' : 'var(--surface)',
                    color: draft.profession === opt ? 'var(--primary-dark)' : 'var(--text-main)',
                    fontWeight: draft.profession === opt ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {opt}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                    {opt === 'Kinésithérapeute' ? '🇫🇷 France' : '🇨🇭 Suisse / 🇧🇪 Belgique'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <div style={sectionTitle}>Compétences & Équipements</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Les propositions de prise en charge seront adaptées en fonction de vos compétences et équipements.
            </p>

            <div style={{ marginBottom: 16 }}>
              <div style={sectionTitle}>Spécialités</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SPECIALITES.map(s => (
                  <button key={s} type="button" style={chipStyle((draft.specialites ?? []).includes(s))}
                    onClick={() => setDraft(p => ({ ...p, specialites: toggleInList(p.specialites, s) }))}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={sectionTitle}>Techniques maîtrisées</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TECHNIQUES.map(t => (
                  <button key={t} type="button" style={chipStyle((draft.techniques ?? []).includes(t))}
                    onClick={() => setDraft(p => ({ ...p, techniques: toggleInList(p.techniques, t) }))}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={sectionTitle}>Équipements au cabinet</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EQUIPEMENTS.map(e => (
                  <button key={e} type="button" style={chipStyle((draft.equipements ?? []).includes(e))}
                    onClick={() => setDraft(p => ({ ...p, equipements: toggleInList(p.equipements, e) }))}>{e}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={sectionTitle}>Autres (non listés ci-dessus)</div>
              <textarea
                value={draft.autresCompetences ?? ''}
                onChange={e => setDraft(p => ({ ...p, autresCompetences: e.target.value }))}
                placeholder="Ex : méthode Schroth, rééducation maxillo-faciale, posturologie, biofeedback, Game Ready..."
                rows={2}
                className="input-luxe"
                style={{ fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 8 }}>En-tête des courriers</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Ces informations apparaîtront en en-tête de vos courriers PDF (fin de PEC, demande d'imagerie, etc.).
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid var(--border-color)' }}>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Prénom (si différent du nom affiché)</label>
                <input type="text" className="input-luxe" value={draft.prenom ?? ''}
                  onChange={e => setDraft(p => ({ ...p, prenom: e.target.value }))}
                  placeholder="Ex : Marie" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Spécialisations (libellé affiché)</label>
                <input type="text" className="input-luxe" value={draft.specialisationsLibelle ?? ''}
                  onChange={e => setDraft(p => ({ ...p, specialisationsLibelle: e.target.value }))}
                  placeholder="Ex : Thérapie manuelle, Rééducation du sportif" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Numéro RCC / ADELI</label>
                <input type="text" className="input-luxe" value={draft.rcc ?? ''}
                  onChange={e => setDraft(p => ({ ...p, rcc: e.target.value }))}
                  placeholder="Ex : 123456789" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Adresse</label>
                <input type="text" className="input-luxe" value={draft.adresse ?? ''}
                  onChange={e => setDraft(p => ({ ...p, adresse: e.target.value }))}
                  placeholder="Ex : 12 rue des Lilas" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Complément (bâtiment, étage)</label>
                <input type="text" className="input-luxe" value={draft.adresseComplement ?? ''}
                  onChange={e => setDraft(p => ({ ...p, adresseComplement: e.target.value }))}
                  placeholder="Ex : Cabinet 2B" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem' }}>CP</label>
                  <input type="text" className="input-luxe" value={draft.codePostal ?? ''}
                    onChange={e => setDraft(p => ({ ...p, codePostal: e.target.value }))}
                    placeholder="75001" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem' }}>Ville</label>
                  <input type="text" className="input-luxe" value={draft.ville ?? ''}
                    onChange={e => setDraft(p => ({ ...p, ville: e.target.value }))}
                    placeholder="Paris" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Téléphone</label>
                <input type="text" className="input-luxe" value={draft.telephone ?? ''}
                  onChange={e => setDraft(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="01 23 45 67 89" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.82rem' }}>Email</label>
                <input type="email" className="input-luxe" value={draft.email ?? ''}
                  onChange={e => setDraft(p => ({ ...p, email: e.target.value }))}
                  placeholder="contact@cabinet.fr" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.82rem' }}>Signature manuscrite (image)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureChange}
                  style={{ fontSize: '0.8rem', marginTop: 4 }}
                />
                {draft.signatureImage && (
                  <div style={{ marginTop: 8, padding: 8, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'inline-block' }}>
                    <img src={draft.signatureImage} alt="Signature" style={{ maxHeight: 50, maxWidth: 180 }} />
                    <button
                      onClick={() => setDraft(p => ({ ...p, signatureImage: null }))}
                      style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                      Retirer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 8 }}>Confidentialité & conformité RGPD</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Mention d'information à intégrer dans votre livret d'accueil, salle d'attente ou politique de confidentialité, ainsi que le registre des traitements effectués.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                Mention d'information patient (à afficher)
              </div>
              <div style={{
                fontSize: '0.78rem', color: '#064e3b', lineHeight: 1.55,
                background: 'var(--surface)', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #bbf7d0', fontFamily: 'Georgia, serif',
                whiteSpace: 'pre-line',
              }}>{RGPD_NOTICE}</div>
              <button
                onClick={handleCopyNotice}
                style={{ marginTop: 10, width: '100%', padding: '0.55rem', borderRadius: 8, background: 'var(--surface)', border: '1px solid #86efac', color: '#065f46', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                Copier le texte
              </button>
            </div>

            <div style={{ background: 'var(--info-soft)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 14, marginTop: 10 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                Registre des traitements
              </div>
              {totalAuditCount === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '0 0 10px', lineHeight: 1.5 }}>Aucun traitement enregistré pour le moment.</p>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 10, lineHeight: 1.5 }}>
                  <div>• <strong>{letterAuditCount}</strong> courrier{letterAuditCount > 1 ? 's' : ''} généré{letterAuditCount > 1 ? 's' : ''}</div>
                  <div>• <strong>{aiAuditCount}</strong> autre{aiAuditCount > 1 ? 's' : ''} analyse{aiAuditCount > 1 ? 's' : ''} (bilans, fiches exos…)</div>
                  {aiAuditWithDocsCount > 0 && (
                    <div style={{ color: '#92400e', marginTop: 4 }}>⚠ {aiAuditWithDocsCount} appel{aiAuditWithDocsCount > 1 ? 's' : ''} avec documents joints (non pseudonymisés automatiquement)</div>
                  )}
                  {aiAuditSuspiciousCount > 0 && (
                    <div style={{ color: '#b91c1c', marginTop: 4, fontWeight: 600 }}>⚠ {aiAuditSuspiciousCount} appel{aiAuditSuspiciousCount > 1 ? 's' : ''} où le scrub wrapper a intercepté un nom — à examiner</div>
                  )}
                </div>
              )}
              <button
                disabled={totalAuditCount === 0}
                onClick={onExportRegister}
                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, background: totalAuditCount === 0 ? 'var(--secondary)' : 'var(--surface)', border: '1px solid var(--border-soft)', color: totalAuditCount === 0 ? 'var(--text-muted)' : 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: totalAuditCount === 0 ? 'not-allowed' : 'pointer' }}>
                Exporter le registre (PDF)
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem', fontSize: '0.92rem' }}>Sauvegarde multi-appareils</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.5 }}>Exporte tes données depuis ce navigateur, puis importe le fichier sur un autre appareil (téléphone, tablette…).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={onExportData}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exporter mes données (.json)
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.75rem', borderRadius: 10, background: 'var(--surface)', border: '1.5px solid var(--border-color)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Importer un fichier de sauvegarde
              </button>
              <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportPick} />
            </div>
          </div>

          <button className="btn-primary-luxe" style={{ marginBottom: '1rem', marginTop: '1.5rem' }} onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
