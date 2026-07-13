export type ThemeMode = 'light' | 'dark';

/**
 * Custom brand palette: primary blue (#3298D4), accent orange (#E97A24),
 * neutral gray (#5A5C5D), white (#FFFFFF).
 * Light: app bg near-white, cards white. Dark: bg deep charcoal, cards lifted gray.
 */
export type ThemeColors = {
  /** CTA, active tab, links */
  primary: string;
  /** Press states, strong headers */
  primaryDark: string;
  /** Subtle highlights, chips */
  primaryLight: string;
  /** Save / like (heart) */
  accent: string;
  onPrimary: string;
  onAccent: string;
  background: string;
  /** Cards, sheets, search bar fill */
  surface: string;
  surfaceSecondary: string;
  surfaceMuted: string;
  surfaceHighlight: string;
  textPrimary: string;
  textSecondary: string;
  /** Input placeholder, hints */
  textPlaceholder: string;
  border: string;
  /** Applied / success, job salary */
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  error: string;
  muted: string;
  badgeBackground: string;
  badgeText: string;
  shadow: string;
  gold: string;
  yellowBackground: string;
  amberBackground: string;
  progressTrack: string;
  progressMuted: string;
  /** Bottom tab inactive icon/label */
  tabInactive: string;
};

export const lightColors: ThemeColors = {
  primary: '#3298D4',
  primaryDark: '#21709F',
  primaryLight: '#66B3E0',
  accent: '#E97A24',
  onPrimary: '#FFFFFF',
  onAccent: '#FFFFFF',
  background: '#F7F8F8',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F1F1',
  surfaceMuted: '#F7F8F8',
  surfaceHighlight: '#E8F3FB',
  textPrimary: '#2A2B2C',
  textSecondary: '#5A5C5D',
  textPlaceholder: '#9C9D9E',
  border: '#E1E2E2',
  success: '#16A34A',
  successBackground: '#DCFCE7',
  warning: '#F59E0B',
  warningBackground: '#FEF3C7',
  error: '#DC2626',
  muted: '#C8C9CA',
  badgeBackground: 'rgba(50, 152, 212, 0.12)',
  badgeText: '#21709F',
  shadow: 'rgba(42, 43, 44, 0.08)',
  gold: '#FFD700',
  yellowBackground: '#FEF9C3',
  amberBackground: 'rgba(233, 122, 36, 0.18)',
  progressTrack: '#E1E2E2',
  progressMuted: '#C8C9CA',
  tabInactive: '#9C9D9E',
};

export const darkColors: ThemeColors = {
  primary: '#5FADE0',
  primaryDark: '#3298D4',
  primaryLight: '#8AC4E8',
  accent: '#F2954F',
  onPrimary: '#FFFFFF',
  onAccent: '#1A1A1B',
  background: '#1A1A1B',
  surface: '#2A2B2C',
  surfaceSecondary: '#3A3C3D',
  surfaceMuted: '#2A2B2C',
  surfaceHighlight: '#1F3A4C',
  textPrimary: '#F7F8F8',
  textSecondary: '#9C9D9E',
  textPlaceholder: '#6E6F70',
  border: '#3A3C3D',
  success: '#22C55E',
  successBackground: '#14532D',
  warning: '#FBBF24',
  warningBackground: '#78350F',
  error: '#EF4444',
  muted: '#5A5C5D',
  badgeBackground: 'rgba(95, 173, 224, 0.2)',
  badgeText: '#BEE1F5',
  shadow: 'rgba(0, 0, 0, 0.4)',
  gold: '#FACC15',
  yellowBackground: '#3F2E06',
  amberBackground: 'rgba(242, 149, 79, 0.22)',
  progressTrack: '#3A3C3D',
  progressMuted: '#5A5C5D',
  tabInactive: '#6E6F70',
};