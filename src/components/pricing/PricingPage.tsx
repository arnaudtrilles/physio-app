import { useState } from 'react'
import { PLANS } from '../../config/stripePlans'
import type { PlanId, BillingInterval } from '../../config/stripePlans'

interface PricingPageProps {
  currentPlan?: PlanId
  userId?: string
  userEmail?: string
  onClose: () => void
}

export function PricingPage({ currentPlan = 'basique', userId, userEmail, onClose }: PricingPageProps) {
  const [billing, setBilling] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState<PlanId | null>(null)

  async function handleChoose(planId: PlanId, priceId: string) {
    if (planId === currentPlan) return
    setLoading(planId)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId,
          userEmail,
          successUrl: `${window.location.origin}/?payment=success`,
          cancelUrl: `${window.location.origin}/?payment=cancelled`,
        }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Plan & Facturation</h2>
        <div style={{ width: 24 }} />
      </header>

      <div className="scroll-area" style={{ paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

          {/* Toggle mensuel / annuel */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Facturation annuelle</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>-10% sur Pro & Cabinet</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {billing === 'annual' && (
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#10b981', background: 'color-mix(in srgb, #10b981 12%, transparent)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>-10%</span>
              )}
              <button
                onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: billing === 'annual' ? 'var(--primary)' : 'var(--border-color)', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <span style={{ position: 'absolute', top: 3, left: billing === 'annual' ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </button>
            </div>
          </div>

          {/* Les 3 forfaits */}
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan
            const isLoading = loading === plan.id
            const price = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly
            const hasDiscount = billing === 'annual' && plan.id !== 'basique'
            const perMonth = billing === 'annual' ? Math.round(plan.priceAnnual / 12) : null

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${plan.highlighted ? 'var(--primary)' : isCurrent ? 'color-mix(in srgb, var(--primary) 30%, transparent)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.1rem',
                  boxShadow: plan.highlighted ? '0 2px 12px rgba(15,23,138,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {plan.highlighted && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: 'white', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', padding: '0.2rem 0.75rem', borderRadius: 99, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Recommandé
                  </div>
                )}

                {/* En-tête plan */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{plan.name}</span>
                      {isCurrent && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', padding: '0.1rem 0.4rem', borderRadius: 99 }}>✓ Actif</span>}
                      {hasDiscount && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#10b981', background: 'color-mix(in srgb, #10b981 12%, transparent)', padding: '0.1rem 0.4rem', borderRadius: 99 }}>-10%</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{plan.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>
                      {price} <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{plan.currency}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {billing === 'annual' ? `/an · ${perMonth}/mois` : '/mois'}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.85rem' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.25rem 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </div>
                  ))}
                  {plan.notIncluded?.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.25rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.55 }}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>✕</span>
                      {f}
                    </div>
                  ))}
                </div>

                {/* Bouton */}
                <button
                  onClick={() => !isCurrent && !isLoading && handleChoose(plan.id, plan.priceId)}
                  disabled={isCurrent || isLoading}
                  style={{
                    width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-full)', border: 'none',
                    fontWeight: 700, fontSize: '0.82rem',
                    cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? 'var(--secondary)' : plan.highlighted ? 'var(--primary)' : 'var(--primary-dark)',
                    color: isCurrent ? 'var(--text-muted)' : 'white',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'opacity 0.15s, transform 0.1s',
                    outline: isCurrent ? '1px solid var(--border-color)' : 'none',
                  }}
                  onPointerDown={e => { if (!isCurrent) e.currentTarget.style.transform = 'scale(0.97)' }}
                  onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {isLoading ? 'Redirection...' : isCurrent ? '✓ Forfait actuel' : `Passer au ${plan.name}`}
                </button>
              </div>
            )
          })}

          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Paiement sécurisé par Stripe · Résiliable à tout moment
          </p>
        </div>
      </div>
    </div>
  )
}
