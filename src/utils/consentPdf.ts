import { jsPDF } from 'jspdf'
import { sanitize } from './pdfGenerator'

// PDF de consentement patient — généré côté client à la création d'un nouveau
// patient. Volontairement court, lisible et rassurant : pas de jargon RGPD
// agressif (ce qui ferait fuir les patients), mais couvre les obligations
// légales FR (CNIL/RGPD Art.9) + CH (nLPD) :
//   - finalité du traitement
//   - durée de conservation explicite (audio jamais conservé)
//   - droits du patient (accès, rectification, effacement)
//   - identification du responsable (kinésithérapeute / physiothérapeute via le profil)
//   - consentement explicite (signature manuscrite)

type Profession = 'Kinésithérapeute' | 'Physiothérapeute'

interface ConsentPatient {
  nom: string
  prenom: string
  dateNaissance: string  // YYYY-MM-DD
}

interface ConsentTherapist {
  nom?: string
  prenom?: string
  cabinet?: string
  email?: string
  profession?: Profession
}

interface ConsentPdfOptions {
  patient: ConsentPatient
  therapist?: ConsentTherapist
  /** PNG data URL de la signature. Si absent → emplacement vierge dessiné. */
  signatureDataUrl?: string
  /** Date de signature ISO. Default = now. */
  signedAt?: string
}

const C = {
  primary: [30, 58, 138] as [number, number, number],
  primaryLight: [239, 246, 255] as [number, number, number],
  accent: [5, 150, 105] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  light: [229, 231, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

function formatDateFr(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export interface ConsentPdfResult {
  blob: Blob
  fileName: string
  signedAt: string
}

export function generateConsentPdf(opts: ConsentPdfOptions): ConsentPdfResult {
  const doc = new jsPDF()
  const W = 210
  const ML = 18
  const MR = 18
  const MW = W - ML - MR
  let y = 0

  const signedAt = opts.signedAt ?? new Date().toISOString()
  const signedDateStr = formatDateFr(signedAt)

  // Terminologie dynamique selon profession (FR : kiné, CH/BE : physio)
  const isPhysio = opts.therapist?.profession === 'Physiothérapeute'
  const therapeuteWord = isPhysio ? 'physiotherapeute' : 'kinesitherapeute'
  const therapieWord = isPhysio ? 'physiotherapie' : 'kinesitherapie'

  // ── En-tête ──
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 28, 'F')
  doc.setFillColor(...C.accent)
  doc.rect(0, 28, W, 1.2, 'F')

  doc.setTextColor(...C.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(sanitize('Information & autorisation'), ML, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(sanitize(`Utilisation d’un assistant numerique pour votre suivi en ${therapieWord}`), ML, 21)

  y = 38
  doc.setTextColor(...C.text)

  // ── Identité patient (pré-remplie) ──
  doc.setFillColor(...C.primaryLight)
  doc.roundedRect(ML, y - 4, MW, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.primary)
  doc.text(sanitize(`${opts.patient.nom.toUpperCase()} ${opts.patient.prenom}`), ML + 4, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  const nePartLabel = sanitize(`Ne(e) le ${formatDateFr(opts.patient.dateNaissance)}`)
  doc.text(nePartLabel, ML + 4, y + 8)
  if (opts.therapist?.nom || opts.therapist?.prenom) {
    const thLabel = sanitize(
      `Therapeute : ${opts.therapist.prenom ?? ''} ${opts.therapist.nom ?? ''}`.trim()
    )
    doc.text(thLabel, ML + 4, y + 12.5)
  }
  y += 24
  doc.setTextColor(...C.text)

  // ── Intro chaleureuse ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const intro = `Bonjour ${opts.patient.prenom},\n\nPour preparer et suivre votre prise en charge, votre ${therapeuteWord} peut utiliser un assistant numerique. Ce document vous explique comment et vous demande votre accord.`
  const introLines = doc.splitTextToSize(sanitize(intro), MW)
  doc.text(introLines, ML, y)
  y += introLines.length * 5 + 4

  // ── Section : Ce que fait l'assistant ──
  const section = (title: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...C.primary)
    doc.text(sanitize(title), ML, y)
    doc.setTextColor(...C.text)
    y += 5.5
  }

  const bulletGood = (text: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.accent)
    doc.text(sanitize('✓'), ML + 1, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...C.text)
    const lines = doc.splitTextToSize(sanitize(text), MW - 7)
    doc.text(lines, ML + 6, y)
    y += lines.length * 4.5 + 1.5
  }

  section('Ce que fait l’assistant')
  bulletGood(`Il transcrit ce qui est dit pendant la seance pour aider votre ${therapeuteWord} a rediger votre dossier plus rapidement.`)
  bulletGood(`Il aide a organiser les informations cliniques recueillies (douleur, mobilite, antecedents) afin que votre ${therapeuteWord} gagne du temps administratif et puisse consacrer davantage de minutes a votre bilan et a votre prise en charge.`)
  bulletGood('Il ne pose aucun diagnostic et ne propose aucun traitement : toutes les decisions cliniques restent celles de votre therapeute.')
  y += 1

  section('Ce que vous devez savoir')
  bulletGood('Vos enregistrements vocaux ne sont jamais conserves. Ils sont transformes en texte sur le moment, puis effaces immediatement.')
  bulletGood('Aucune image ni video n’est enregistree. Seule la voix sert ponctuellement a la transcription.')
  bulletGood('Vos donnees sont traitees en France, sur des serveurs Microsoft Azure agrees Hebergeur de Donnees de Sante (HDS).')
  bulletGood(`Seul votre ${therapeuteWord} a acces a votre dossier. Aucune donnee n’est utilisee a des fins commerciales ou publicitaires.`)
  y += 1

  section('Vos droits')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const droits = `A tout moment, vous pouvez demander a consulter, modifier ou supprimer vos donnees. Vous pouvez aussi retirer cet accord. Il vous suffit d’en parler a votre ${therapeuteWord}, qui s’en chargera. Conformement au RGPD (UE) et a la nLPD (Suisse), votre consentement est libre et revocable.`
  const droitsLines = doc.splitTextToSize(sanitize(droits), MW)
  doc.text(droitsLines, ML, y)
  y += droitsLines.length * 4.5 + 4

  // ── Encadré "Je consens" ──
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.4)
  const consentBoxH = 22
  doc.roundedRect(ML, y, MW, consentBoxH, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.primary)
  doc.text(sanitize('En signant ci-dessous :'), ML + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.text)
  const consentText = `J’autorise mon ${therapeuteWord} a utiliser cet assistant numerique pour ma prise en charge, dans les conditions decrites ci-dessus.`
  const consentLines = doc.splitTextToSize(sanitize(consentText), MW - 8)
  doc.text(consentLines, ML + 4, y + 12)
  y += consentBoxH + 6

  // ── Zone signature ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.text(sanitize('Signature du patient'), ML, y)
  doc.text(sanitize(`Date : ${signedDateStr}`), W - MR - doc.getTextWidth(sanitize(`Date : ${signedDateStr}`)), y)
  y += 3

  const sigBoxX = ML
  const sigBoxY = y
  const sigBoxW = MW
  const sigBoxH = 32
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.roundedRect(sigBoxX, sigBoxY, sigBoxW, sigBoxH, 2, 2, 'D')

  if (opts.signatureDataUrl) {
    try {
      // jsPDF accepte data:image/png. On centre la signature dans le cadre.
      const inset = 2
      doc.addImage(
        opts.signatureDataUrl,
        'PNG',
        sigBoxX + inset,
        sigBoxY + inset,
        sigBoxW - inset * 2,
        sigBoxH - inset * 2,
      )
    } catch (err) {
      console.warn('[consentPdf] Failed to embed signature image:', err)
    }
  } else {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...C.muted)
    doc.text(sanitize('(signature requise)'), sigBoxX + sigBoxW / 2 - 12, sigBoxY + sigBoxH / 2 + 1)
  }
  y = sigBoxY + sigBoxH + 6

  // ── Footer ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  const footerLines = [
    'Document genere automatiquement et conserve dans votre dossier patient.',
    'Conformite : RGPD (UE) Art. 9 - donnees de sante / loi federale sur la protection des donnees (CH).',
  ]
  doc.text(sanitize(footerLines.join('  ·  ')), ML, 285)

  const blob = doc.output('blob')
  const dateForFile = signedAt.split('T')[0]
  const safeName = `${opts.patient.nom}_${opts.patient.prenom}`.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `Consentement_${safeName}_${dateForFile}.pdf`

  return { blob, fileName, signedAt }
}
