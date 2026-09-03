// Shared between page.tsx (progress display) and actions.ts (the actual
// enforced goal — rateTitleAction auto-finishes onboarding once real
// ratings reach this count, per the "rate until we have enough, then
// skip straight to recommendations" flow).
export const RATING_GOAL = 15;
