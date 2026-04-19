import { useState } from 'react'
import type { PlanId, Subscription } from '../types'

interface WelcomeScreenProps {
  onLogin: () => void
  onSignup: (subscription: Subscription) => void
}

type PlanGroup = 'solo' | 'multi'

interface Plan {
  id: PlanId
  name: string
  tagline: string
  priceMonth: number
  highlight: boolean
  badge?: string
  features: string[]
  agentVocal: boolean
}

const SOLO_PLANS: Plan[] = [
  {
    id: 'solo_basic',
    name: 'Basic',
    tagline: '1 kinésithérapeute',
    priceMonth: 49,
    highlight: false,
    features: ['Bilans illimités', 'Analyse IA Gemini', 'Export PDF', 'Banque exercices'],
    agentVocal: false,
  },
  {
    id: 'solo_pro',
    name: 'Pro',
    tagline: '1 kinésithérapeute',
    priceMonth: 89,
    highlight: true,
    badge: 'POPULAIRE',
    features: ['Tout Basic inclus', 'Évolution IA patient', 'Objectifs SMART', 'Timeline & stats'],
    agentVocal: false,
  },
  {
    id: 'solo_pro_max',
    name: 'Pro Max',
    tagline: '1 kinésithérapeute',
    priceMonth: 129,
    highlight: false,
    badge: 'PREMIUM',
    features: ['Tout Pro inclus', 'Stats avancées', 'Support prioritaire', 'Accès bêta nouveautés'],
    agentVocal: true,
  },
]

const MULTI_PLANS: Plan[] = [
  {
    id: 'multi_basic',
    name: 'Basic',
    tagline: '3 kinésithérapeutes',
    priceMonth: 179,
    highlight: false,
    features: ['Solo Basic × 3 comptes', 'Dashboard cabinet', 'Gestion des patients partagée'],
    agentVocal: false,
  },
  {
    id: 'multi_pro',
    name: 'Pro',
    tagline: '5 kinésithérapeutes',
    priceMonth: 279,
    highlight: true,
    badge: 'POPULAIRE',
    features: ['Solo Pro × 5 comptes', 'Stats cabinet globales', 'Support prioritaire'],
    agentVocal: false,
  },
  {
    id: 'multi_pro_max',
    name: 'Pro Max',
    tagline: '5 kinésithérapeutes',
    priceMonth: 399,
    highlight: false,
    badge: 'PREMIUM',
    features: ['Tout Multi Pro inclus', '5 comptes kinés', 'Onboarding dédié', 'Support dédié'],
    agentVocal: true,
  },
]

const PLAN_COLORS: Record<string, { color: string; border: string }> = {
  solo_basic:    { color: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.35)' },
  solo_pro:      { color: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.45)' },
  solo_pro_max:  { color: 'rgba(139,92,246,0.22)',  border: 'rgba(139,92,246,0.55)' },
  multi_basic:   { color: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.35)' },
  multi_pro:     { color: 'rgba(255,255,255,0.14)', border: 'rgba(255,255,255,0.45)' },
  multi_pro_max: { color: 'rgba(139,92,246,0.22)',  border: 'rgba(139,92,246,0.55)' },
}

export function WelcomeScreen({ onLogin, onSignup }: WelcomeScreenProps) {
  const [annual, setAnnual] = useState(false)
  const [group, setGroup] = useState<PlanGroup>('solo')
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('solo_pro_max')

  const plans = group === 'solo' ? SOLO_PLANS : MULTI_PLANS

  const monthlyPrice = (base: number) => annual ? Math.round(base * 0.8) : base
  const annualTotal  = (base: number) => Math.round(base * 12 * 0.8)

  const selectedPlan = [...SOLO_PLANS, ...MULTI_PLANS].find(p => p.id === selectedPlanId)!

  const handleStart = () => {
    const now = new Date()
    const trialEnd = selectedPlan.agentVocal
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null
    const subscription: Subscription = {
      planId: selectedPlanId,
      subscribedAt: now.toISOString(),
      trialAgentUntil: trialEnd,
    }
    onSignup(subscription)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'var(--primary-dark)' }}>

      {/* Gradient animé */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 45%, #1e40af 75%, #0f172a 100%)', backgroundSize: '300% 300%', animation: 'gradientShift 8s ease infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '80px', left: '-50px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite reverse', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, padding: '2rem 1.25rem 1.5rem', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Physio<span style={{ color: 'var(--primary-light)' }}>Scan</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 2 }}>
              Bilans cliniques assistés par IA
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={onLogin} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '6px 14px', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Connexion
            </button>
          </div>
        </div>

        {/* Badge essai */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.1))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '999px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              14 jours d'essai gratuits — sans carte bancaire
            </span>
          </div>
        </div>

        {/* Toggle Solo / Multi */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, marginBottom: '1.1rem', gap: 4 }}>
          {(['solo', 'multi'] as PlanGroup[]).map(g => (
            <button
              key={g}
              onClick={() => {
                setGroup(g)
                setSelectedPlanId(g === 'solo' ? 'solo_pro_max' : 'multi_pro_max')
              }}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                background: group === g ? 'white' : 'transparent',
                color: group === g ? 'var(--primary-dark)' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s',
              }}
            >
              {g === 'solo' ? '👤 Solo' : '🏥 Cabinet'}
            </button>
          ))}
        </div>

        {/* Toggle mensuel / annuel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ color: annual ? 'rgba(255,255,255,0.45)' : 'white', fontSize: '0.82rem', fontWeight: 600, transition: 'color 0.2s' }}>Mensuel</span>
          <button onClick={() => setAnnual(!annual)} style={{ width: 48, height: 26, borderRadius: '999px', background: annual ? 'var(--primary-light)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 3, left: annual ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: annual ? 'white' : 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: 600, transition: 'color 0.2s' }}>Annuel</span>
            {annual && <span style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '999px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, color: '#6ee7b7' }}>-20%</span>}
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.1rem' }}>
          {plans.map(plan => {
            const selected = selectedPlanId === plan.id
            const colors = PLAN_COLORS[plan.id]
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                style={{
                  background: selected ? colors.color : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${selected ? colors.border : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -10, left: plan.id === 'multi_pro_max' ? undefined : '50%',
                    right: plan.id === 'multi_pro_max' ? 12 : undefined,
                    transform: plan.id === 'multi_pro_max' ? 'none' : 'translateX(-50%)',
                    background: plan.id === 'multi_pro_max'
                      ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                      : 'white',
                    color: plan.id === 'multi_pro_max' ? 'white' : 'var(--primary)',
                    borderRadius: '999px', padding: '2px 12px',
                    fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {/* Radio */}
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? 'white' : 'rgba(255,255,255,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'border-color 0.2s' }}>
                      {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem' }}>{plan.name}</span>
                        {plan.agentVocal && (
                          <span style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(59,130,246,0.4))', border: '1px solid rgba(139,92,246,0.5)', borderRadius: '999px', padding: '1px 7px', fontSize: '0.62rem', fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 3 }}>
                            🎙 Agent IA
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.71rem' }}>{plan.tagline}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem', lineHeight: 1 }}>
                      {monthlyPrice(plan.priceMonth)} <span style={{ fontSize: '0.63rem', fontWeight: 600 }}>CHF/mois</span>
                    </div>
                    {annual && (
                      <div style={{ color: '#6ee7b7', fontSize: '0.67rem', fontWeight: 700 }}>
                        {annualTotal(plan.priceMonth)} CHF/an
                      </div>
                    )}
                  </div>
                </div>

                {selected && (
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem' }}>
                      {plan.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.71rem', color: 'rgba(255,255,255,0.72)' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {f}
                          {i < plan.features.length - 1 && <span style={{ color: 'rgba(255,255,255,0.18)', marginLeft: 2 }}>·</span>}
                        </div>
                      ))}
                    </div>
                    {plan.agentVocal && (
                      <div style={{ marginTop: 8, padding: '7px 10px', background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.15))', border: '1px solid rgba(139,92,246,0.35)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        </svg>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c4b5fd' }}>Agent IA Vocal — 7j offerts</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(196,181,253,0.65)' }}>Powered by ElevenLabs · Voix Lucie en français</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <button
            onClick={handleStart}
            style={{ width: '100%', padding: '0.9rem', borderRadius: '14px', background: selectedPlan?.agentVocal ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'white', border: 'none', color: selectedPlan?.agentVocal ? 'white' : 'var(--primary)', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)' }}
          >
            {selectedPlan?.agentVocal
              ? '🎙 Démarrer avec l\'Agent IA — 7j offerts'
              : 'Démarrer l\'essai gratuit — 14 jours'}
          </button>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', margin: 0 }}>
            Sans carte bancaire · Annulation à tout moment
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
