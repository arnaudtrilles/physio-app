/**
 * Indicateur de chargement affiché en `fallback` des frontières <Suspense>
 * autour des composants chargés en lazy. Atome présentationnel sans état,
 * extrait verbatim d'App.tsx (markup identique) pour servir de source unique.
 */
export const LazyFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
    <div className="spinner" style={{ width: 28, height: 28 }} />
  </div>
)
