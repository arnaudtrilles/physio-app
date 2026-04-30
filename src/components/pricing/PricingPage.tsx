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

  const activePlan = PLANS.find(p => p.id === currentPlan) ?? PLANS[0]
  const currentPrice = billing === 'annual'
    ? `${activePlan.priceAnnual} CHF / an · soit ${(activePlan.priceAnnual / 12).toFixed(2)} CHF/mois`
    : `${activePlan.priceMonthly} CHF / mois`

  const upgradePlans = PLANS.filter(p => p.id !== currentPlan)

  async function handleChoose(planId: PlanId, priceId: string) {
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>1 mois offert vs mensuel</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {billing === 'annual' && (
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>-8%</span>
              )}
              <button
                onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                style={{
                  width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: billing === 'annual' ? 'var(--primary)' : 'var(--border-color)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: billing === 'annual' ? 23 : 3,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          {/* Plan actuel — carte gradient comme dans Settings */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #f59e0b 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Abonnement actuel</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Votre plan PhysioScan</div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', marginBottom: '1rem', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan actuel</div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }}>✓ Actif</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>{activePlan.name}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 8 }}>{currentPrice}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                  Facturation {billing === 'annual' ? 'annuelle' : 'mensuelle'} · Gérer via Stripe
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Inclus dans votre plan</div>
              {activePlan.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>✓</span>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Changer de plan */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Changer de plan</div>

            {upgradePlans.map(plan => {
              const price = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly
              const perMonth = billing === 'annual' ? (plan.priceAnnual / 12).toFixed(0) : null
              const isLoading = loading === plan.id

              return (
                <div
                  key={plan.id}
                  onClick={() => !isLoading && handleChoose(plan.id, plan.priceId)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${plan.highlighted ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: plan.highlighted ? 'color-mix(in srgb, var(--primary) 5%, var(--surface))' : 'var(--secondary)',
                    marginBottom: 8, cursor: isLoading ? 'default' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{plan.name}</span>
                      {plan.highlighted && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', padding: '0.1rem 0.35rem', borderRadius: 99 }}>Populaire</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{plan.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                    {isLoading ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>...</span>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{price} CHF</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {billing === 'annual' ? `/an · ${perMonth}/mois` : '/mois'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem', lineHeight: 1.4 }}>
              Paiement sécurisé par Stripe · Résiliable à tout moment
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
