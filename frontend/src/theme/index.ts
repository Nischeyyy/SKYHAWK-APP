export const theme = {
  colors: {
    surface: '#0F172A',
    onSurface: '#F8FAFC',
    surfaceSecondary: '#1E293B',
    onSurfaceSecondary: '#CBD5E1',
    surfaceTertiary: '#334155',
    onSurfaceTertiary: '#94A3B8',
    surfaceInverse: '#F8FAFC',
    onSurfaceInverse: '#0F172A',
    brand: '#F59E0B',
    brandPrimary: '#F59E0B',
    onBrandPrimary: '#0F172A',
    brandSecondary: '#D97706',
    brandTertiary: '#451A03',
    onBrandTertiary: '#FDE68A',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    border: '#334155',
    borderStrong: '#475569',
    divider: '#1E293B',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  font: {
    display: 'System', // Barlow Condensed - fallback to System since not loaded
    body: 'System',
  },
  fontSize: { xs: 11, sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, huge: 36, hero: 48 },
};

export type Theme = typeof theme;
