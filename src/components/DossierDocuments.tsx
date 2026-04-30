import { memo, useRef, useState } from 'react'
import type { BilanRecord, PatientDocument, PatientDocumentSource } from '../types'
import { sourceBadgeLabel } from '../utils/pdfPersistence'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RenameTarget =
  | { kind: 'bilan'; bilanId: number; docIndex: number }
  | { kind: 'standalone'; docId: string }

export type DeleteTarget =
  | { kind: 'bilan'; bilanId: number; docIndex: number }
  | { kind: 'standalone'; docId: string }

interface UnifiedDoc {
  key: string
  name: string
  mimeType: string
  data: string          // version caviardée (ou brute si non masqué)
  originalData?: string // version originale pour affichage/impression
  masked?: boolean
  addedAt: string
  // source
  kind: 'bilan' | 'standalone'
  bilanId?: number
  bilanZone?: string
  bilanDate?: string
  docIndex?: number
  docId?: string
  /** Origine d'un document standalone (upload vs PDF auto-généré). */
  patientDocSource?: PatientDocumentSource
  /** true = PDF auto-généré par l'app (badge dédié). */
  generated?: boolean
}

interface DossierDocumentsProps {
  patientKey: string
  bilans: BilanRecord[]
  standaloneDocs: PatientDocument[]
  onRename: (target: RenameTarget, newName: string) => void
  onDelete: (target: DeleteTarget) => void
  onAddRaw: (dataUrl: string, name: string, mimeType: string) => void
  /** Relancer le caviardage sur un document standalone existant */
  onRemask?: (docId: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(b64: string | undefined, mimeType: string): string {
  if (!b64) return '—'
  // base64 size → approximate binary size (bytes)
  const header = `data:${mimeType};base64,`
  const raw = b64.startsWith('data:') ? b64.slice(b64.indexOf(',') + 1) : b64
  const bytes = Math.round((raw.length * 3) / 4)
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  void header
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function ensureDataUrl(data: string | undefined, mimeType: string): string {
  if (!data) return ''
  return data.startsWith('data:') ? data : `data:${mimeType};base64,${data}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch {
    return ''
  }
}

/** Renvoie l'original si disponible, sinon la version masquée. Peut être undefined si le doc est corrompu/incomplet. */
function getDisplayData(doc: UnifiedDoc): string | undefined {
  return doc.originalData ?? doc.data
}

function triggerDownload(doc: UnifiedDoc) {
  const url = ensureDataUrl(getDisplayData(doc), doc.mimeType)
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = doc.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function DocViewer({ doc, onClose }: { doc: UnifiedDoc; onClose: () => void }) {
  const url = ensureDataUrl(getDisplayData(doc), doc.mimeType)
  const isImg = doc.mimeType.startsWith('image/')
  if (!url) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, boxSizing: 'border-box',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: 12, padding: '1.5rem 1.75rem',
            maxWidth: 360, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            Document indisponible
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
            Le contenu de « {doc.name} » est manquant. Le document a été sauvegardé sans ses données binaires (ancien format ou exportation PDF). Tu peux le supprimer pour nettoyer le dossier.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1rem', borderRadius: 8, border: 'none',
              background: '#0f172a', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
      }}
    >
      {/* Card wrapping header + content — sizes to content */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex', flexDirection: 'column',
          maxWidth: '100%', maxHeight: '100%',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          background: isImg ? 'transparent' : 'white',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.75)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0, color: 'white', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.name}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        {isImg ? (
          <img
            src={url}
            alt={doc.name}
            style={{
              display: 'block', maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain', minHeight: 0,
            }}
          />
        ) : (
          <iframe
            src={url}
            title={doc.name}
            style={{
              border: 'none', background: 'white',
              width: 'min(1000px, 92vw)', height: '85vh', minHeight: 0,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileIcon({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType === 'application/pdf'
  const isImg = mimeType.startsWith('image/')
  const bg = isPdf ? '#fee2e2' : isImg ? '#dbeafe' : '#f1f5f9'
  const fg = isPdf ? '#dc2626' : isImg ? '#1d4ed8' : '#64748b'
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 8, background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
    }}>
      {isPdf ? 'PDF' : isImg ? 'IMG' : 'DOC'}
    </div>
  )
}

function IconBtn({ onClick, title, children, danger }: { onClick: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)',
        background: 'white', color: danger ? '#dc2626' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const DossierDocuments = memo(function DossierDocuments({ patientKey, bilans, standaloneDocs, onRename, onDelete, onAddRaw, onRemask }: DossierDocumentsProps) {
  void patientKey
  const [renamingKey, setRenamingKey] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<UnifiedDoc | null>(null)
  const [showSourceMenu, setShowSourceMenu] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build unified list
  const unified: UnifiedDoc[] = []
  for (const b of bilans) {
    const docs = b.documents ?? []
    docs.forEach((d, i) => {
      unified.push({
        key: `bilan-${b.id}-${i}`,
        name: d.name,
        mimeType: d.mimeType,
        data: d.data,
        originalData: d.originalData,
        masked: d.masked,
        addedAt: d.addedAt,
        kind: 'bilan',
        bilanId: b.id,
        bilanZone: b.zone,
        bilanDate: b.dateBilan,
        docIndex: i,
      })
    })
  }
  for (const d of standaloneDocs) {
    unified.push({
      key: `std-${d.id}`,
      name: d.name,
      mimeType: d.mimeType,
      data: d.data,
      originalData: d.originalData,
      masked: d.masked,
      addedAt: d.addedAt,
      kind: 'standalone',
      docId: d.id,
      patientDocSource: d.source,
      generated: d.generated,
    })
  }
  unified.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))

  const startRename = (doc: UnifiedDoc) => {
    setRenamingKey(doc.key)
    setRenameValue(doc.name)
  }

  const commitRename = (doc: UnifiedDoc) => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === doc.name) { setRenamingKey(null); return }
    if (doc.kind === 'bilan' && doc.bilanId != null && doc.docIndex != null) {
      onRename({ kind: 'bilan', bilanId: doc.bilanId, docIndex: doc.docIndex }, trimmed)
    } else if (doc.kind === 'standalone' && doc.docId) {
      onRename({ kind: 'standalone', docId: doc.docId }, trimmed)
    }
    setRenamingKey(null)
  }

  const handleFiles = async (files: FileList | null, inputRef?: React.RefObject<HTMLInputElement | null>) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const mimeType = file.type || 'application/octet-stream'
      if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') continue
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      onAddRaw(dataUrl, file.name, mimeType)
    }
    const ref = inputRef ?? fileInputRef
    if (ref.current) ref.current.value = ''
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
          DOCUMENTS {unified.length > 0 && `· ${unified.length}`}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files, cameraInputRef)} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files, galleryInputRef)} />
      <input ref={fileInputRef} type="file" accept="application/pdf,image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

      {/* Add button with source menu */}
      <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
        <button
          type="button"
          onClick={() => setShowSourceMenu(prev => !prev)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.35rem', padding: '0.6rem 0.5rem',
            borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)',
            background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Ajouter un document
        </button>
        {showSourceMenu && (
          <>
          <div onClick={() => setShowSourceMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden' }}>
            {[
              { ref: cameraInputRef, label: 'Prendre une photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
              { ref: galleryInputRef, label: 'Galerie photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
              { ref: fileInputRef, label: 'Fichiers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
            ].map((opt, i) => (
              <button key={i} type="button"
                onClick={() => { setShowSourceMenu(false); opt.ref.current?.click() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
                <span style={{ color: 'var(--primary)', display: 'flex' }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
          </>
        )}
      </div>

      {unified.length === 0 ? (
        <div style={{ padding: '12px 4px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Aucun document.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {unified.map(doc => {
            const isRenaming = renamingKey === doc.key
            const isConfirmingDelete = confirmDeleteId === doc.key
            return (
              <div
                key={doc.key}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)', padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <FileIcon mimeType={doc.mimeType} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(doc)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(doc)
                        if (e.key === 'Escape') setRenamingKey(null)
                      }}
                      style={{
                        width: '100%', fontSize: 13, fontWeight: 600, color: '#0f172a',
                        padding: '2px 6px', border: '1.5px solid var(--primary)',
                        borderRadius: 6, outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <div
                      onDoubleClick={() => startRename(doc)}
                      title="Double-cliquez pour renommer"
                      style={{
                        fontSize: 13, fontWeight: 600, color: '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        cursor: 'text',
                      }}
                    >
                      {doc.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {doc.kind === 'bilan' ? (
                      <span style={{
                        display: 'inline-block', padding: '0 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600, background: '#dbeafe', color: '#1e3a8a', lineHeight: '16px',
                      }}>
                        {doc.bilanZone ?? 'Bilan'} · {doc.bilanDate}
                      </span>
                    ) : doc.generated ? (
                      <span style={{
                        display: 'inline-block', padding: '0 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#92400e', lineHeight: '16px',
                      }}>
                        {sourceBadgeLabel(doc.patientDocSource) ?? 'Auto-généré'}
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '0 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600, background: '#ecfdf5', color: '#047857', lineHeight: '16px',
                      }}>
                        Dossier
                      </span>
                    )}
                    {doc.originalData && doc.masked && (
                      <span style={{
                        display: 'inline-block', padding: '0 6px', borderRadius: 4,
                        fontSize: 10, fontWeight: 600, background: '#f5f3ff', color: '#7c3aed', lineHeight: '16px',
                      }}>
                        Anonymisé
                      </span>
                    )}
                    {doc.originalData && !doc.masked && (
                      <span
                        onClick={e => { e.stopPropagation(); if (doc.kind === 'standalone' && doc.docId && onRemask) onRemask(doc.docId) }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 6px', borderRadius: 4,
                          fontSize: 10, fontWeight: 600, background: '#fef2f2', color: '#dc2626', lineHeight: '16px',
                          cursor: onRemask && doc.kind === 'standalone' ? 'pointer' : 'default',
                        }}
                        title={onRemask && doc.kind === 'standalone' ? 'Cliquez pour anonymiser' : undefined}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Non anonymisé
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatSize(getDisplayData(doc), doc.mimeType)} · {formatDate(doc.addedAt)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <IconBtn onClick={() => setViewingDoc(doc)} title="Visualiser">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </IconBtn>
                  <IconBtn onClick={() => triggerDownload(doc)} title="Télécharger">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </IconBtn>
                  <IconBtn onClick={() => startRename(doc)} title="Renommer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </IconBtn>
                  {isConfirmingDelete ? (
                    <>
                      <IconBtn
                        onClick={() => {
                          if (doc.kind === 'standalone' && doc.docId) {
                            onDelete({ kind: 'standalone', docId: doc.docId })
                          } else if (doc.kind === 'bilan' && typeof doc.bilanId === 'number' && typeof doc.docIndex === 'number') {
                            onDelete({ kind: 'bilan', bilanId: doc.bilanId, docIndex: doc.docIndex })
                          }
                          setConfirmDeleteId(null)
                        }}
                        title="Confirmer"
                        danger
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </IconBtn>
                      <IconBtn onClick={() => setConfirmDeleteId(null)} title="Annuler">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </IconBtn>
                    </>
                  ) : (
                    <IconBtn onClick={() => setConfirmDeleteId(doc.key)} title="Supprimer" danger>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </IconBtn>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  )
})
