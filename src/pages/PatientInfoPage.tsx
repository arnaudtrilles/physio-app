import { useEffect } from 'react'

/**
 * Page publique d'information patient — accessible à /patients.
 *
 * Calquée sur le modèle Heidi Health (transparence radicale, ton accessible) et
 * conforme à l'article 13 du RGPD (information du patient lors de la collecte
 * de ses données). Le praticien reste le responsable de traitement ; Canode
 * agit en sous-traitant au sens de l'article 28 du RGPD.
 */
export default function PatientInfoPage() {
  useEffect(() => {
    document.title = 'Canode — Information patient'
  }, [])

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.brandWrap}>
          <span style={S.logo}>Canode</span>
          <span style={S.tag}>Assistant clinique pour kinésithérapeutes</span>
        </div>
      </header>

      <main style={S.main}>
        <section style={S.hero}>
          <h1 style={S.h1}>Votre kinésithérapeute utilise Canode.</h1>
          <p style={S.lead}>
            Canode est un assistant numérique qui aide votre kinésithérapeute à rédiger
            ses notes cliniques pendant la consultation. Cette page vous explique exactement
            ce que cela signifie pour vous, ce qui est enregistré, ce qui ne l'est pas, et
            les droits dont vous disposez.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Ce que fait Canode</h2>
          <p style={S.p}>
            Pendant votre consultation, votre kinésithérapeute peut activer un mode dictée
            ou enregistrement vocal. Canode transcrit alors la conversation en texte, puis
            génère automatiquement un compte rendu structuré : motif de consultation, examen
            clinique, tests réalisés, plan de traitement.
          </p>
          <p style={S.p}>
            L'objectif est simple : permettre à votre kinésithérapeute de vous regarder, de
            vous écouter et de vous examiner pleinement, sans avoir à taper sur un clavier
            en permanence.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Ce qui est traité — et ce qui ne l'est pas</h2>
          <div style={S.grid}>
            <div style={S.card}>
              <div style={S.cardTitle}>Audio</div>
              <p style={S.cardP}>
                L'enregistrement audio est transcrit en texte, puis supprimé immédiatement.
                Aucun audio n'est conservé après la séance.
              </p>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Texte clinique</div>
              <p style={S.cardP}>
                Le compte rendu écrit est conservé dans votre dossier patient chez votre
                kinésithérapeute, comme l'auraient été des notes manuscrites ou tapées.
              </p>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Données identifiantes</div>
              <p style={S.cardP}>
                Votre nom, prénom et autres coordonnées sont remplacés par une étiquette
                neutre avant tout envoi à nos prestataires d'intelligence artificielle.
              </p>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Hébergement</div>
              <p style={S.cardP}>
                Les services d'IA utilisés sont hébergés en France (transcription) et au sein
                de l'Union européenne ou d'États reconnus adéquats par la Commission européenne
                (analyse). Aucun transfert n'a lieu vers des juridictions sans cadre adéquat.
              </p>
            </div>
          </div>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Qui est responsable de vos données ?</h2>
          <p style={S.p}>
            <strong>Votre kinésithérapeute</strong> est le responsable de traitement de
            votre dossier au sens de l'article 4.7 du Règlement général sur la protection
            des données (RGPD). C'est lui qui décide quelles données sont collectées et à
            quelles fins, dans le respect du Code de la santé publique et du secret
            professionnel auquel il est tenu.
          </p>
          <p style={S.p}>
            <strong>Canode</strong> agit en qualité de sous-traitant au sens de l'article 28
            du RGPD. Nous traitons vos données uniquement sur instruction de votre
            kinésithérapeute, pour les seules finalités prévues, et sans réutilisation pour
            entraîner un quelconque modèle d'intelligence artificielle.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Vos droits</h2>
          <p style={S.p}>
            Conformément aux articles 15 à 22 du RGPD, vous disposez à tout moment des
            droits suivants :
          </p>
          <ul style={S.ul}>
            <li><strong>Accès</strong> — obtenir une copie des données que votre kinésithérapeute détient sur vous.</li>
            <li><strong>Rectification</strong> — corriger une information inexacte.</li>
            <li><strong>Effacement</strong> — demander la suppression de votre dossier, sous réserve des obligations légales de conservation applicables aux professionnels de santé.</li>
            <li><strong>Limitation</strong> — restreindre temporairement le traitement de vos données.</li>
            <li><strong>Opposition</strong> — refuser que la dictée vocale soit utilisée pour vos consultations ; votre kinésithérapeute poursuivra alors la prise en charge sans cet outil.</li>
            <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré et lisible par machine.</li>
            <li><strong>Réclamation</strong> — saisir la Commission nationale de l'informatique et des libertés (CNIL) si vous estimez que vos droits ne sont pas respectés.</li>
          </ul>
          <p style={S.p}>
            Pour exercer ces droits, adressez-vous directement à votre kinésithérapeute,
            qui est votre interlocuteur de référence en tant que responsable de traitement.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Consentement</h2>
          <p style={S.p}>
            Avant d'utiliser Canode lors de votre consultation, votre kinésithérapeute
            recueille votre consentement oral, après vous avoir expliqué le fonctionnement
            de l'outil. Ce consentement est tracé dans votre dossier, sans qu'aucune
            signature ne vous soit demandée.
          </p>
          <p style={S.p}>
            Vous pouvez retirer ce consentement à tout moment, sans avoir à vous justifier
            et sans conséquence sur la qualité ou la continuité de votre prise en charge.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Sécurité</h2>
          <p style={S.p}>
            Vos données sont chiffrées en transit (TLS 1.2 ou supérieur) et au repos. Les
            accès aux systèmes sont strictement nominatifs et journalisés. La transcription
            vocale s'appuie sur un service hébergé en France auprès d'un Hébergeur de
            Données de Santé (HDS) certifié au sens de l'article L. 1111-8 du Code de la
            santé publique.
          </p>
        </section>

        <section style={S.section}>
          <h2 style={S.h2}>Nous contacter</h2>
          <p style={S.p}>
            Pour toute question concernant le traitement de vos données par Canode en
            qualité de sous-traitant : <a style={S.a} href="mailto:contact@canode.app">contact@canode.app</a>.
          </p>
          <p style={S.pMuted}>
            Pour toute demande relative à votre dossier de soins (accès, rectification,
            effacement), adressez-vous à votre kinésithérapeute.
          </p>
        </section>

        <footer style={S.footer}>
          <div>Canode — Assistant clinique pour kinésithérapeutes et physiothérapeutes</div>
          <div style={S.footerSmall}>Cette page d'information est mise à jour régulièrement.</div>
        </footer>
      </main>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#fafaf9',
    color: '#1c1917',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.65,
  } as React.CSSProperties,
  header: {
    background: '#fff',
    borderBottom: '1px solid #e7e5e4',
    padding: '20px 24px',
  } as React.CSSProperties,
  brandWrap: {
    maxWidth: 760,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  logo: {
    fontSize: '1.35rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0f766e',
  } as React.CSSProperties,
  tag: {
    fontSize: '0.82rem',
    color: '#78716c',
  } as React.CSSProperties,
  main: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '40px 24px 80px',
  } as React.CSSProperties,
  hero: {
    marginBottom: 48,
  } as React.CSSProperties,
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
    margin: '0 0 16px',
    color: '#0c0a09',
  } as React.CSSProperties,
  lead: {
    fontSize: '1.08rem',
    color: '#44403c',
    margin: 0,
  } as React.CSSProperties,
  section: {
    marginBottom: 40,
  } as React.CSSProperties,
  h2: {
    fontSize: '1.25rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    margin: '0 0 12px',
    color: '#0f766e',
  } as React.CSSProperties,
  p: {
    fontSize: '0.98rem',
    color: '#292524',
    margin: '0 0 12px',
  } as React.CSSProperties,
  pMuted: {
    fontSize: '0.92rem',
    color: '#78716c',
    margin: '8px 0 0',
  } as React.CSSProperties,
  ul: {
    fontSize: '0.98rem',
    color: '#292524',
    paddingLeft: 22,
    margin: '0 0 12px',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginTop: 8,
  } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e7e5e4',
    borderRadius: 12,
    padding: '16px 18px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#0f766e',
    marginBottom: 6,
    letterSpacing: '0.01em',
  } as React.CSSProperties,
  cardP: {
    fontSize: '0.9rem',
    color: '#44403c',
    margin: 0,
    lineHeight: 1.55,
  } as React.CSSProperties,
  a: {
    color: '#0f766e',
    textDecoration: 'underline',
  } as React.CSSProperties,
  footer: {
    borderTop: '1px solid #e7e5e4',
    paddingTop: 24,
    marginTop: 60,
    fontSize: '0.85rem',
    color: '#78716c',
  } as React.CSSProperties,
  footerSmall: {
    fontSize: '0.78rem',
    color: '#a8a29e',
    marginTop: 6,
  } as React.CSSProperties,
}
