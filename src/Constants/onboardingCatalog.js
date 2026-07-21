export const ONBOARDING_STEPS = ['Your Profile', 'Payment', 'Get Started'];

// GET /plans returns one flat `features` array per plan (not split into
// "usage" vs "support" groups) — these slugs classify each feature for
// display, and pick a short subset for the compact plan-card summary.
export const PLAN_SUPPORT_FEATURE_SLUGS = [
  'dedicated-rm',
  'whatsapp-support',
  'app-access',
  'emergency-support',
  'priority-support',
];

export const PLAN_CARD_FEATURE_SLUGS = [
  'service-requests',
  'parent-care-visits',
  'property-inspection',
  'document-assistance',
  'legal-consultation',
];
