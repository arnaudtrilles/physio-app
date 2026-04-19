// Design tokens — source of truth for colors, spacing, typography.
// Mirrors CSS variables in index.css so we can use them from both JS and CSS.

export const colors = {
  // Brand
  primary: '#1e3a8a',
  primaryDark: '#0f172a',
  primaryLight: '#3b82f6',
  accent: '#2563eb',

  // Surfaces
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  base: '#e2e8f0',
  border: '#cbd5e1',
  borderSoft: '#e2e8f0',

  // Text
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',

  // Semantic
  success: '#166534',
  successBg: '#dcfce7',
  successSoft: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fef3c7',
  warningSoft: '#fff7ed',
  danger: '#881337',
  dangerBg: '#fee2e2',
  dangerSoft: '#fef2f2',
  info: '#2563eb',
  infoBg: '#dbeafe',
  infoSoft: '#eff6ff',

  // Entity colors (séance/bilan/interm)
  seance: '#7c3aed',
  seanceBg: '#ede9fe',
  seanceSoft: '#f5f3ff',
  bilan: '#1e3a8a',
  bilanBg: '#dbeafe',
  bilanSoft: '#eff6ff',
  interm: '#c2410c',
  intermBg: '#ffedd5',
  intermSoft: '#fff7ed',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 28,
  full: 9999,
} as const

export const typography = {
  // Font sizes (rem)
  caption: '0.68rem',
  meta: '0.72rem',
  label: '0.78rem',
  body: '0.88rem',
  bodyLg: '0.95rem',
  heading: '1.05rem',
  title: '1.2rem',
  display: '1.5rem',
  hero: '1.85rem',

  // Weights
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const

export const shadow = {
  xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
  sm: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
  md: '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.05)',
  lg: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
  xl: '0 20px 40px -12px rgba(15, 23, 42, 0.18)',
  primary: '0 4px 14px 0 rgba(30, 58, 138, 0.22)',
  primaryStrong: '0 12px 24px -10px rgba(30, 58, 138, 0.25)',
} as const

export const motion = {
  fast: '0.15s cubic-bezier(0.22, 1, 0.36, 1)',
  normal: '0.22s cubic-bezier(0.22, 1, 0.36, 1)',
  slow: '0.35s cubic-bezier(0.22, 1, 0.36, 1)',
} as const
