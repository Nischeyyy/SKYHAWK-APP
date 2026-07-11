export const theme = {
  colors: {
    // Layered surfaces (dark mode elevation)
    bg: '#000000',
    card: '#161616',
    cardElevated: '#1F1F1F',
    border: 'rgba(255,255,255,0.06)',
    divider: 'rgba(255,255,255,0.08)',

    // Text
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',

    // Signature accent — Electric Blue (interactive)
    accent: '#0A84FF',
    onAccent: '#FFFFFF',

    // Semantic — reserved
    verified: '#30D158', // green: active / clocked in / verified
    warning: '#FF9F0A',  // orange: expiring credentials
    danger: '#FF453A',   // red: SOS only

    // Legacy alias so lingering references still work
    error: '#FF453A',
    success: '#30D158',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40, xxxxl: 56 },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 },
  font: {
    size: {
      caption: 11,
      footnote: 12,
      body: 15,
      callout: 16,
      title: 17,
      lead: 20,
      h1: 24,
      h2: 28,
      hero: 38,
    },
  },
};
