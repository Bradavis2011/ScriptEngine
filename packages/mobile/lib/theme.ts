export const colors = {
  background: '#0B0B0D',
  card: '#141417',
  cardAlt: '#1C1C24',
  border: '#2A2A35',
  accent: '#00E5FF',   // cyan — primary CTA
  primary: '#7C3AED', // purple — series / badges
  success: '#22C55E', // green
  warning: '#F97316', // orange
  error: '#EF4444',
  neutral: '#A1A1AA',
  white: '#F9FAFB',
  muted: '#6B7280',
};

export const scriptTypeColors: Record<string, string> = {
  series_episode: '#7C3AED',
  data_drop: '#00E5FF',
  trend_take: '#F97316',
  niche_tip: '#22C55E',
};

export const scriptTypeLabels: Record<string, string> = {
  series_episode: 'Series',
  data_drop: 'Data Drop',
  trend_take: 'Trend Take',
  niche_tip: 'Niche Tip',
};

export const typography = {
  displayLarge: { fontSize: 28, fontWeight: '800' as const, color: '#F9FAFB' },
  displayMedium: { fontSize: 22, fontWeight: '700' as const, color: '#F9FAFB' },
  displaySmall: { fontSize: 18, fontWeight: '700' as const, color: '#F9FAFB' },
  body: { fontSize: 15, fontWeight: '400' as const, color: '#F9FAFB', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: '#A1A1AA', lineHeight: 19 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
