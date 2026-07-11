export const theme = {
  colors: {
    // Base
    bg: '#000000',
    card: '#111111',
    cardAlt: '#1A1A1A',
    border: '#2A2A2A',
    divider: '#2C2C2E',

    // Text
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',

    // Accent (white only, no color)
    accent: '#FFFFFF',
    onAccent: '#000000',

    // Semantic (used sparingly — errors + status only)
    error: '#FF453A',
    success: '#30D158',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 },
  radius: { sm: 6, md: 10, lg: 14, pill: 999 },
  font: {
    size: {
      caption: 11,
      footnote: 12,
      body: 15,
      callout: 16,
      title: 17,
      lead: 20,
      h1: 28,
      hero: 32,
    },
    weight: { regular: '400' as const, medium: '500' as const, semi: '600' as const, bold: '700' as const },
  },
};
