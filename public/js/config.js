// config.js — sports, performance metric matrices, fee plans, age groups.

export const SPORTS = ['Football', 'Cricket', 'Basketball', 'Badminton'];

export const AGE_GROUPS = [
  { value: 'U6-U9', label: 'Grassroots (U6-U9)' },
  { value: 'U10-U13', label: 'Development (U10-U13)' },
  { value: 'U14-U18', label: 'Competitive (U14-U18)' }
];

export const FEE_PLANS = [
  { value: 'monthly', label: 'Monthly flat fee' },
  { value: 'per_session', label: 'Per session (rate × sessions)' },
  { value: 'package', label: 'Package (prepaid sessions)' }
];

// NOTE: Sport performance metrics now live in config/sportMetrics.js (single
// source of truth for the Performance view's matrix, summary and entry form).
