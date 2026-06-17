import { useState } from 'react'
import type { BilanDocument } from '../types'
import type { ToastType } from '../hooks/useToast'

type Setter<T> = (value: T | ((prev: T) => T)) => void
type MaskingQueueItem = { dataUrl: string; name: string; mimeType: string }

interface DocumentAttachmentSectionProps {
  documents: BilanDocument[]
  setDocuments: Setter<BilanDocument[]>
  setMaskingQueue: Setter<MaskingQueueItem[]>
  showToast: (message: string, type?: ToastType) => void
}

/**
 * Section « Documents joints » d'un bilan : liste des pièces déjà attachées,
 * sélecteur de source (photo / galerie / fichiers) et conversion des PDF en
 * images. Les images brutes sont poussées dans la file de masquage (maskingQueue)
 * — le masquage des données patient reste géré par le parent.
 *
 * Extraction verbatim du bloc inline d'App.tsx (comportement identique) : seul
 * l'état local `showDocSourceMenu`, propre à cette section, est internalisé.
 */
export function DocumentAttachmentSection({
  documents,
  setDocuments,
  setMaskingQueue,
  showToast,
}: DocumentAttachmentSectionProps) {
  const [showDocSourceMenu, setShowDocSourceMenu] = useState(false)

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
      <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 4 }}>
        Documents joints
      </label>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
        Radios, comptes rendus médicaux, IRM… L'analyse en tiendra compte.
      </p>
      {documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {documents.map((doc, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--secondary)', borderRadius: 8, padding: '6px 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
              <button onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Hidden file inputs for each source */}
      {(['camera', 'gallery', 'files'] as const).map(source => (
        <input key={source} id={`doc-input-${source}`} type="file"
          accept={source === 'files' ? 'image/*,application/pdf' : 'image/*'}
          {...(source === 'camera' ? { capture: 'environment' } : {})}
          multiple={source !== 'camera'}
          style={{ display: 'none' }}
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            files.forEach(file => {
              const reader = new FileReader()
              reader.onload = async ev => {
                const dataUrl = ev.target?.result as string
                const mimeType = file.type || 'application/octet-stream'
                if (mimeType.startsWith('image/')) {
                  setMaskingQueue(prev => [...prev, { dataUrl, name: file.name, mimeType }])
                } else if (mimeType === 'application/pdf') {
                  showToast('Conversion du PDF en images…', 'info')
                  try {
                    const { pdfToImages } = await import('../utils/pdfToImages')
                    const images = await pdfToImages(dataUrl)
                    const baseName = file.name.replace(/\.pdf$/i, '')
                    const items = images.map((imgDataUrl, i) => ({
                      dataUrl: imgDataUrl,
                      name: images.length > 1 ? `${baseName} — page ${i + 1}.jpg` : `${baseName}.jpg`,
                      mimeType: 'image/jpeg',
                    }))
                    setMaskingQueue(prev => [...prev, ...items])
                  } catch (err) {
                    console.error('Erreur conversion PDF', err)
                    showToast('Erreur lors de la conversion du PDF', 'error')
                  }
                } else {
                  showToast('Format non supporté. Uniquement images et PDF.', 'error')
                }
              }
              reader.readAsDataURL(file)
            })
            e.target.value = ''
          }} />
      ))}
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowDocSourceMenu(prev => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--input-bg)', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Ajouter un document
        </button>
        {showDocSourceMenu && (
          <>
          <div onClick={() => setShowDocSourceMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 20, overflow: 'hidden' }}>
            {[
              { id: 'camera', label: 'Prendre une photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
              { id: 'gallery', label: 'Galerie photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
              { id: 'files', label: 'Fichiers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
            ].map(opt => (
              <button key={opt.id} type="button"
                onClick={() => { setShowDocSourceMenu(false); document.getElementById(`doc-input-${opt.id}`)?.click() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
                <span style={{ color: 'var(--primary)', display: 'flex' }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          </>
        )}
      </div>
      <p style={{ fontSize: '0.7rem', color: '#92400e', margin: '6px 0 0', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Masquez les infos patient (nom, date de naissance, n° sécu) avant l'envoi à l'IA.
      </p>
    </div>
  )
}
