// Mirrors the web app's Tailwind palette (indigo accent, slate neutrals) so
// the two clients read as the same product. Not a full design system yet -
// just enough for WO-0's placeholder screens; expand as real screens land.
export const colors = {
  accent: '#4f46e5', // indigo-600
  accentDark: '#4338ca', // indigo-700
  background: '#f8fafc', // slate-50
  surface: '#ffffff',
  border: '#e2e8f0', // slate-200
  text: '#0f172a', // slate-900
  textMuted: '#64748b', // slate-500
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
};

// bg/fg pairs for the five status tones (see lib/statusTone.ts) - same
// semantics as the web app's status pill classes.
export const tones = {
  neutral: { bg: '#f1f5f9', fg: '#475569' }, // slate-100 / slate-600
  accent: { bg: '#e0e7ff', fg: '#4338ca' }, // indigo-100 / indigo-700
  warning: { bg: '#fef3c7', fg: '#b45309' }, // amber-100 / amber-700
  success: { bg: '#dcfce7', fg: '#15803d' }, // green-100 / green-700
  danger: { bg: '#fee2e2', fg: '#b91c1c' }, // red-100 / red-700
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
