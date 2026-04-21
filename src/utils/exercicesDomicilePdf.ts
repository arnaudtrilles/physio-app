import { jsPDF } from 'jspdf'
import type { ExerciceDomicile } from '../components/NoteSeance'

interface PatientInfo {
  nom?: string
  prenom?: string
}

interface BuildOptions {
  patient: PatientInfo
  zone?: string
  dateSeance?: string
}

const sanitize = (text: string): string =>
  text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\u00B2/g, '2')
    .replace(/\u00B3/g, '3')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u00D7/g, 'x')

export function buildExercicesPDF(exercices: ExerciceDomicile[], opts: BuildOptions): jsPDF {
  const doc = new jsPDF()
  const W = 210
  const ML = 18
  const MR = 18
  const MW = W - ML - MR
  let y = 20
  const check = (need = 10) => {
    if (y + need > 282) {
      doc.addPage()
      y = 20
    }
  }
  const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

  // Header vert charte
  doc.setFillColor(45, 90, 75)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(30, 70, 58)
  doc.rect(0, 30, W, 1.5, 'F')
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(sanitize("EXERCICES A DOMICILE"), ML, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const name = `${opts.patient.prenom ?? ''} ${opts.patient.nom ?? ''}`.trim() || 'Patient'
  const zoneLabel = opts.zone ? ` - ${opts.zone}` : ''
  doc.text(sanitize(`${name}${zoneLabel}`), ML, 22)
  const dateStr =
    opts.dateSeance ??
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(sanitize(dateStr), W - MR - doc.getTextWidth(sanitize(dateStr)), 22)
  doc.setTextColor(31, 41, 55)
  y = 42

  // Liste des exercices
  exercices.forEach((ex, i) => {
    check(28)
    // Badge numéro + titre
    doc.setFillColor(45, 90, 75)
    doc.circle(ML + 3.5, y - 1, 3.5, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(String(i + 1), ML + 3.5, y + 0.6, { align: 'center' })
    doc.setTextColor(31, 41, 55)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const titleLines = split(ex.nom || 'Exercice', MW - 10)
    doc.text(titleLines[0] ?? '', ML + 9, y)
    y += 5.5
    for (let k = 1; k < titleLines.length; k++) {
      check(5)
      doc.text(titleLines[k], ML + 9, y)
      y += 5
    }

    if (ex.categorie) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      const catLines = split(ex.categorie, MW - 10)
      for (const line of catLines) {
        check(4.5)
        doc.text(line, ML + 9, y)
        y += 4.5
      }
      doc.setTextColor(31, 41, 55)
    }

    // Protocole en ligne
    const proto = ex.protocole
    if (proto) {
      const rows: string[] = []
      if (proto.series) rows.push(`Series : ${proto.series}`)
      if (proto.tempsOuReps) rows.push(`Reps/Temps : ${proto.tempsOuReps}`)
      if (proto.recuperation) rows.push(`Repos : ${proto.recuperation}`)
      if (proto.frequence) rows.push(`Frequence : ${proto.frequence}`)
      if (rows.length > 0) {
        y += 1
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setFillColor(245, 247, 245)
        const line = rows.join('   -   ')
        const protoLines = split(line, MW - 14)
        const blockH = protoLines.length * 4.8 + 4
        check(blockH)
        doc.roundedRect(ML + 9, y - 3, MW - 9, blockH, 2, 2, 'F')
        for (const pl of protoLines) {
          doc.text(pl, ML + 12, y + 1)
          y += 4.8
        }
        y += 2
      }
    }

    // Description
    if (ex.description && ex.description.trim()) {
      y += 1
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(55, 65, 81)
      const descLines = split(ex.description.trim(), MW - 10)
      for (const line of descLines) {
        check(4.5)
        doc.text(line, ML + 9, y)
        y += 4.5
      }
      doc.setTextColor(31, 41, 55)
    }

    // Séparateur entre exercices
    if (i < exercices.length - 1) {
      y += 4
      check(3)
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.3)
      doc.line(ML, y, W - MR, y)
      y += 5
    } else {
      y += 3
    }
  })

  // Footer sur chaque page
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(ML, 286, W - MR, 286)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(107, 114, 128)
    doc.text(
      sanitize('Arretez en cas de douleur intense et contactez votre therapeute.'),
      ML,
      291,
    )
    doc.text(`Page ${p}/${totalPages}`, W - MR - 18, 291)
    doc.setTextColor(31, 41, 55)
  }

  return doc
}

export function downloadExercicesPDF(exercices: ExerciceDomicile[], opts: BuildOptions): void {
  const doc = buildExercicesPDF(exercices, opts)
  const safe = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  const name = safe(`${opts.patient.nom ?? 'Patient'}_${opts.patient.prenom ?? ''}`).replace(/_+/g, '_')
  const date = new Date().toISOString().split('T')[0]
  doc.save(`Exercices_${name}_${date}.pdf`)
}
