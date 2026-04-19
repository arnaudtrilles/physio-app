import { useRef, useEffect, useCallback, useState } from 'react'
import { useElevenLabsAgent } from '../hooks/useElevenLabsAgent'
import type { AgentStatus, AgentToolCallbacks } from '../hooks/useElevenLabsAgent'

interface AgentVocalIAProps {
  agentId: string
  toolCallbacks: AgentToolCallbacks
  onClose: () => void
}

// ── Mini orbe (compact) ───────────────────────────────────────────────────────
function MiniOrb({ status }: { status: AgentStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const tRef      = useRef(0)
  const isSpeaking  = status === 'speaking'
  const isListening = status === 'listening'
  const isActive    = isSpeaking || isListening || status === 'connected'

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, R = W * 0.44
    const speed = isSpeaking ? 0.04 : isListening ? 0.02 : 0.009
    const amp   = isSpeaking ? 1.3  : isListening ? 0.85 : 0.45
    tRef.current += speed
    const t = tRef.current
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()
    const bg = ctx.createRadialGradient(cx, cy - R * 0.2, 0, cx, cy, R)
    bg.addColorStop(0, '#1a0a2e'); bg.addColorStop(0.5, '#0d0521'); bg.addColorStop(1, '#060312')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    const LINES = [
      { color: '#ff2dff', width: isSpeaking ? 2 : 1.1, phase: 0 },
      { color: '#00d4ff', width: isSpeaking ? 1.8 : 1, phase: 2.2 },
      { color: '#7b2fff', width: isSpeaking ? 1.4 : 0.7, phase: 3.3 },
      { color: '#ff60e8', width: isSpeaking ? 1.5 : 0.8, phase: 4.4 },
    ]
    LINES.forEach(({ color, width, phase }) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width
      ctx.shadowColor = color; ctx.shadowBlur = isSpeaking ? 14 : 6
      ctx.globalAlpha = isActive ? 0.88 : 0.32
      const pts = 60
      for (let i = 0; i <= pts; i++) {
        const frac = i / pts, angle = frac * Math.PI * 2
        const dx = amp * R * 0.33 * Math.sin(angle * 3 + t * 1.3 + phase)
                 + amp * R * 0.18 * Math.sin(angle * 5 - t * 0.9 + phase * 1.5)
        const dy = amp * R * 0.33 * Math.cos(angle * 2 + t * 1.1 + phase)
                 + amp * R * 0.20 * Math.cos(angle * 4 - t * 1.4 + phase * 1.2)
        const px = cx + (R * 0.73 + dx) * Math.cos(angle)
        const py = cy + (R * 0.73 + dy) * Math.sin(angle)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath(); ctx.stroke()
    })
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
    const coreR = isSpeaking ? R * 0.3 : R * 0.18
    const pulse = 1 + (isSpeaking ? 0.14 : 0.05) * Math.sin(t * (isSpeaking ? 6 : 3))
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * pulse)
    coreGrad.addColorStop(0, 'rgba(255,120,255,0.55)'); coreGrad.addColorStop(1, 'rgba(0,180,255,0)')
    ctx.fillStyle = coreGrad
    ctx.beginPath(); ctx.arc(cx, cy, coreR * pulse * 1.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    animRef.current = requestAnimationFrame(draw)
  }, [status, isActive, isSpeaking, isListening])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  return <canvas ref={canvasRef} width={64} height={64} style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }} />
}

// ── Grande orbe (mode plein écran) ────────────────────────────────────────────
function PlasmaOrb({ status }: { status: AgentStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const tRef      = useRef(0)
  const isSpeaking  = status === 'speaking'
  const isListening = status === 'listening'
  const isActive    = isSpeaking || isListening || status === 'connected'

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, R = W * 0.42
    const speed = isSpeaking ? 0.035 : isListening ? 0.018 : 0.008
    const amp   = isSpeaking ? 1.4   : isListening ? 0.9   : 0.5
    tRef.current += speed
    const t = tRef.current
    ctx.clearRect(0, 0, W, H)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()
    const bgGrad = ctx.createRadialGradient(cx, cy - R * 0.2, 0, cx, cy, R)
    bgGrad.addColorStop(0, '#1a0a2e'); bgGrad.addColorStop(0.5, '#0d0521'); bgGrad.addColorStop(1, '#060312')
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H)
    const LINES = [
      { color: '#ff2dff', width: isSpeaking ? 2.2 : 1.2, phase: 0 },
      { color: '#bf3fff', width: isSpeaking ? 1.8 : 1.0, phase: 1.1 },
      { color: '#00d4ff', width: isSpeaking ? 2.0 : 1.1, phase: 2.2 },
      { color: '#7b2fff', width: isSpeaking ? 1.5 : 0.8, phase: 3.3 },
      { color: '#ff60e8', width: isSpeaking ? 1.6 : 0.9, phase: 4.4 },
      { color: '#40e0ff', width: isSpeaking ? 1.4 : 0.7, phase: 5.5 },
    ]
    LINES.forEach(({ color, width, phase }) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width
      ctx.shadowColor = color; ctx.shadowBlur = isSpeaking ? 18 : 8
      ctx.globalAlpha = isActive ? 0.85 : 0.35
      const pts = 80
      for (let i = 0; i <= pts; i++) {
        const frac = i / pts, angle = frac * Math.PI * 2
        const dx = amp * R * 0.35 * Math.sin(angle * 3 + t * 1.3 + phase)
                 + amp * R * 0.2  * Math.sin(angle * 5 - t * 0.9 + phase * 1.5)
                 + amp * R * 0.12 * Math.cos(angle * 7 + t * 1.7 + phase * 0.7)
        const dy = amp * R * 0.35 * Math.cos(angle * 2 + t * 1.1 + phase)
                 + amp * R * 0.22 * Math.cos(angle * 4 - t * 1.4 + phase * 1.2)
                 + amp * R * 0.1  * Math.sin(angle * 6 + t * 0.8 + phase * 1.8)
        const px = cx + (R * 0.75 + dx) * Math.cos(angle)
        const py = cy + (R * 0.75 + dy) * Math.sin(angle)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath(); ctx.stroke()
    })
    ctx.globalAlpha = 1; ctx.shadowBlur = 0
    const coreR = isSpeaking ? R * 0.28 : R * 0.18
    const pulse = 1 + (isSpeaking ? 0.15 : 0.06) * Math.sin(t * (isSpeaking ? 6 : 3))
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * pulse)
    coreGrad.addColorStop(0, 'rgba(255,120,255,0.55)'); coreGrad.addColorStop(0.4, 'rgba(140,60,255,0.3)'); coreGrad.addColorStop(1, 'rgba(0,180,255,0)')
    ctx.fillStyle = coreGrad
    ctx.beginPath(); ctx.arc(cx, cy, coreR * pulse * 1.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    const borderGrad = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R)
    borderGrad.addColorStop(0, 'rgba(180,60,255,0)')
    borderGrad.addColorStop(0.6, isActive ? 'rgba(200,80,255,0.45)' : 'rgba(120,40,180,0.2)')
    borderGrad.addColorStop(1, isActive ? 'rgba(100,200,255,0.35)' : 'rgba(60,100,180,0.15)')
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = borderGrad; ctx.fill()
    const specGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.32, 0, cx - R * 0.28, cy - R * 0.32, R * 0.45)
    specGrad.addColorStop(0, 'rgba(255,255,255,0.18)'); specGrad.addColorStop(0.5, 'rgba(200,150,255,0.07)'); specGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
    ctx.fillStyle = specGrad; ctx.fillRect(0, 0, W, H); ctx.restore()
    animRef.current = requestAnimationFrame(draw)
  }, [status, isActive, isSpeaking, isListening])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  const size = 240
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: -16, borderRadius: '50%',
        boxShadow: isActive
          ? '0 0 60px 20px rgba(180,60,255,0.35), 0 0 120px 40px rgba(60,180,255,0.2)'
          : '0 0 30px 8px rgba(120,40,180,0.2)',
        transition: 'box-shadow 0.8s ease',
        animation: isSpeaking ? 'orbGlow 1.2s ease-in-out infinite' : 'none',
      }} />
      <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '50%', display: 'block' }} />
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export function AgentVocalIA({ agentId, toolCallbacks, onClose }: AgentVocalIAProps) {
  const { status, messages, error, isMuted, activePatient, lastDisconnectReason, start, stop, toggleMute } =
    useElevenLabsAgent({ agentId, toolCallbacks })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(true)
  const isActive = status === 'connected' || status === 'listening' || status === 'speaking'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const statusText: Record<AgentStatus, string> = {
    idle:         'Appuyer pour démarrer',
    connecting:   'Connexion…',
    connected:    'Connectée',
    listening:    'En écoute',
    speaking:     'Lucie parle…',
    error:        'Erreur de connexion',
    disconnected: 'Session terminée',
  }

  // Derniers messages agent (transcript) + actions système
  const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent')
  const lastSystemMsgs = messages.filter(m => m.role === 'system').slice(-3)

  // ── MODE PLEIN ÉCRAN ─────────────────────────────────────────────────────────
  if (expanded) {
    const recentMessages = messages.filter(m => m.role !== 'system').slice(-3)
    return (
      <div style={{
        position: 'fixed', top: 0, bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse at center, #0d0521 0%, #06030f 100%)',
        overflow: 'hidden',
      }}>
        {/* Particules bg */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', width: 2 + (i % 3), height: 2 + (i % 3), borderRadius: '50%',
              background: i % 2 === 0 ? 'rgba(200,80,255,0.4)' : 'rgba(60,180,255,0.35)',
              left: `${8 + (i * 7.3) % 84}%`, top: `${5 + (i * 11.7) % 90}%`,
              animation: `floatParticle ${4 + (i % 5)}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3rem 1.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? '#a855f7' : 'rgba(255,255,255,0.2)', boxShadow: isActive ? '0 0 8px #a855f7' : 'none', transition: 'all 0.5s', animation: isActive ? 'dotPulse 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isActive ? '#d8b4fe' : 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PhysioScan · Agent IA
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Réduire */}
            <button onClick={() => setExpanded(false)} aria-label="Réduire"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 21 6 15"/></svg>
            </button>
            {/* Fermer */}
            <button onClick={async () => { await stop(); onClose() }} aria-label="Fermer"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>
              ×
            </button>
          </div>
        </div>

        {/* Zone centrale */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
          {activePatient && (
            <div style={{ padding: '6px 16px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: activePatient.avatarBg || '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                {(activePatient.nom[0] || '?')}{(activePatient.prenom[0] || '?')}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#d8b4fe' }}>
                {activePatient.prenom} {activePatient.nom}
              </span>
            </div>
          )}
          <PlasmaOrb status={status} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 4 }}>Lucie</div>
            <div style={{ fontSize: '0.8rem', color: isActive ? '#c084fc' : 'rgba(255,255,255,0.3)', fontWeight: 500, transition: 'color 0.5s' }}>
              {statusText[status]}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 1.5rem', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6 }}>
          {recentMessages.map((msg, i) => (
            <div key={i} style={{
              fontSize: '0.8rem', lineHeight: 1.5,
              color: msg.role === 'agent' ? 'rgba(216,180,254,0.9)' : 'rgba(255,255,255,0.55)',
              textAlign: msg.role === 'agent' ? 'left' : 'right',
              fontStyle: msg.role === 'agent' ? 'normal' : 'italic',
              opacity: i === recentMessages.length - 1 ? 1 : 0.5,
            }}>
              {msg.role === 'agent' && <span style={{ color: '#a855f7', fontWeight: 700, marginRight: 4 }}>Lucie</span>}
              {msg.text}
            </div>
          ))}
          {error && (
            <div style={{ fontSize: '0.75rem', color: '#fca5a5', textAlign: 'center', padding: '8px 12px', background: 'rgba(220,38,38,0.12)', borderRadius: 10 }}>
              {error}
            </div>
          )}
          {status === 'disconnected' && lastDisconnectReason && (
            <div style={{ fontSize: '0.72rem', color: '#fde68a', textAlign: 'center', padding: '8px 12px', background: 'rgba(180,120,0,0.15)', border: '1px solid rgba(253,230,138,0.25)', borderRadius: 10 }}>
              Session terminée · {lastDisconnectReason}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Contrôles */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '1.5rem 1.5rem 3rem' }}>
          <button onClick={toggleMute} disabled={!isActive} aria-label={isMuted ? 'Réactiver' : 'Couper le micro'}
            style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${isMuted ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}`, background: isMuted ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isActive ? 'pointer' : 'default', color: isMuted ? '#fca5a5' : 'rgba(255,255,255,0.4)', opacity: isActive ? 1 : 0.3, transition: 'all 0.3s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMuted
                ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/></>
                : <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></>
              }
            </svg>
          </button>
          <button onClick={isActive ? stop : start} disabled={status === 'connecting'}
            style={{ width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: status === 'connecting' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: status === 'connecting' ? 0.6 : 1, transition: 'all 0.3s',
              background: isActive ? 'linear-gradient(135deg, #dc2626, #7f1d1d)' : 'linear-gradient(135deg, #9333ea, #4f46e5)',
              boxShadow: isActive ? '0 0 30px rgba(220,38,38,0.5)' : '0 0 30px rgba(147,51,234,0.5)',
            }}>
            {status === 'connecting'
              ? <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
              : isActive
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="6" width="4" height="12" rx="1"/></svg>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            }
          </button>
          <div style={{ width: 48 }} />
        </div>

        <style>{`
          @keyframes orbGlow {
            0%,100% { box-shadow: 0 0 60px 20px rgba(180,60,255,0.35), 0 0 120px 40px rgba(60,180,255,0.2); }
            50%      { box-shadow: 0 0 80px 30px rgba(180,60,255,0.55), 0 0 160px 60px rgba(60,180,255,0.3); }
          }
          @keyframes dotPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
          @keyframes floatParticle { 0%,100% { transform:translateY(0) scale(1); opacity:0.4; } 50% { transform:translateY(-18px) scale(1.3); opacity:0.8; } }
          @keyframes spin { to { transform:rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  // ── MODE COMPACT — barre de bas ──────────────────────────────────────────────
  return (
    <>
      <div style={{
        position: 'fixed', bottom: '4.5rem',
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, zIndex: 9999,
        background: 'linear-gradient(180deg, rgba(13,5,33,0.97) 0%, rgba(6,3,18,0.99) 100%)',
        borderTop: `1px solid ${isActive ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isActive
          ? '0 -4px 30px rgba(168,85,247,0.25), 0 -1px 0 rgba(168,85,247,0.3)'
          : '0 -4px 20px rgba(0,0,0,0.4)',
        transition: 'border-color 0.5s, box-shadow 0.5s',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Handle de drag visuel */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 32, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Ligne principale : orbe cliquable + agrandir + fermer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>

          {/* Orbe cliquable — appuyer pour démarrer/arrêter */}
          <button onClick={isActive ? stop : start} disabled={status === 'connecting'}
            aria-label={isActive ? 'Arrêter Lucie' : 'Démarrer Lucie'}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: status === 'connecting' ? 'not-allowed' : 'pointer', padding: 0, flexShrink: 0 }}>
            <div style={{
              position: 'absolute', inset: -6, borderRadius: '50%',
              boxShadow: isActive ? '0 0 20px 6px rgba(168,85,247,0.55)' : 'none',
              animation: status === 'speaking' ? 'orbGlow 1.2s ease-in-out infinite' : 'none',
              transition: 'box-shadow 0.5s',
            }} />
            {status === 'connecting'
              ? <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(147,51,234,0.3)', borderTopColor: '#9333ea', animation: 'spin 0.8s linear infinite', background: '#0d0521' }} />
              : <MiniOrb status={status} />
            }
          </button>

          {/* Label état */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>Lucie</div>
            <div style={{ fontSize: '0.68rem', color: isActive ? '#c084fc' : 'rgba(255,255,255,0.35)' }}>
              {status === 'connecting' ? 'Connexion…' : isActive ? 'Appuyer pour arrêter' : 'Appuyer pour démarrer'}
            </div>
          </div>

          {/* Agrandir + Fermer */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setExpanded(true)} aria-label="Agrandir"
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 9 12 3 6 9"/></svg>
            </button>
            <button onClick={async () => { await stop(); onClose() }} aria-label="Fermer"
              style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>
              ×
            </button>
          </div>
        </div>

        {/* Patient actif badge */}
        {activePatient && (
          <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: activePatient.avatarBg || '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {(activePatient.nom[0] || '?')}{(activePatient.prenom[0] || '?')}
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(216,180,254,0.7)' }}>
              {activePatient.prenom} {activePatient.nom}
            </span>
          </div>
        )}
      </div>

      {/* Spacer pour que le contenu ne soit pas caché derrière la barre */}
      <div style={{ height: activePatient ? 202 : 177 }} />

      <style>{`
        @keyframes orbGlow {
          0%,100% { box-shadow: 0 0 16px 4px rgba(168,85,247,0.5); }
          50%      { box-shadow: 0 0 28px 10px rgba(168,85,247,0.8), 0 0 40px 16px rgba(60,180,255,0.4); }
        }
        @keyframes dotPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </>
  )
}
