import { useState } from 'react'
import { PLANS } from '../../config/stripePlans'
import type { PlanId } from '../../config/stripePlans'

interface PricingPageProps {
  currentPlan?: PlanId
  userId?: string
  userEmail?: string
  onClose: () => void
}

export function PricingPage({ currentPlan, userId, userEmail, onClose }: PricingPageProps) {
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
    } catch (err) {
      console.error(err)
      setLoading(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--base-bg)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Retour
        </button>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Choisir un forfait</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '1.5rem 1.25rem', flex: 1 }}>
        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
            Votre forfait PhysioScan
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Résiliable à tout moment · Paiement sécurisé par Stripe · Prix en CHF
          </div>
        </div>

        {/* Cards forfaits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  borderRadius: 'var(--radius-xl)',
                  border: plan.highlighted
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border-color)',
                  background: plan.highlighted
                    ? 'color-mix(in srgb, var(--primary) 5%, var(--surface))'
                    : 'var(--surface)',
                  padding: '1.25rem',
                  position: 'relative',
                  boxShadow: plan.highlighted ? '0 4px 20px rgba(15,23,138,0.12)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {plan.highlighted && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--primary)', color: 'white',
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                    padding: '0.2rem 0.75rem', borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                  }}>
                    Recommandé
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{plan.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{plan.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      {plan.price} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{plan.currency}</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/mois</div>
                  </div>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded?.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleChoose(plan.id, plan.priceId)}
                  disabled={isCurrent || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent
                      ? 'var(--border-color)'
                      : plan.highlighted
                      ? 'var(--primary)'
                      : 'var(--primary-dark)',
                    color: isCurrent ? 'var(--text-muted)' : 'white',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onPointerDown={e => { if (!isCurrent) e.currentTarget.style.transform = 'scale(0.97)' }}
                  onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                  onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {isLoading ? 'Redirection...' : isCurrent ? '✓ Forfait actuel' : `Choisir ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Note bas de page */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Paiement sécurisé par Stripe · Aucune carte requise pour essayer<br />
          Résiliable à tout moment depuis votre espace Stripe
        </div>
      </div>
    </div>
  )
}
