import { radius } from './radius';
import { cardPadding, spacing } from './spacing';

/**
 * Reusable layout tokens: buttons, job card, search, tab bar.
 * Pair with colors from useTheme() at runtime (e.g. primary for CTA fill).
 */
export const components = {
  button: {
    minHeight: 48,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  jobCard: {
    borderRadius: radius.card,
    paddingVertical: cardPadding.vertical,
    paddingHorizontal: cardPadding.horizontal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBar: {
    borderRadius: radius.search,
    paddingHorizontal: spacing.sm + spacing.xs,
    minHeight: 44,
  },
  tabBar: {
    height: 56,
  },
} as const;
