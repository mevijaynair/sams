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

// Sport-specific evaluation matrices. Each metric: { key, label, type, def, min, max, options }.
export const SPORT_METRICS = {
  Football: [
    { key: 'passing_accuracy', label: 'Passing Accuracy (%)', type: 'number', def: 75, min: 0, max: 100 },
    { key: 'one_v_one_success', label: '1v1 Success Rate (%)', type: 'number', def: 60, min: 0, max: 100 },
    { key: 'sprint_counts', label: 'High-Intensity Sprints', type: 'number', def: 12, min: 0, max: 200 },
    { key: 'positioning', label: 'Tactical Positioning', type: 'select', def: 'High', options: ['Low', 'Medium', 'High'] }
  ],
  Cricket: [
    { key: 'batting_avg', label: 'Batting Average', type: 'number', def: 25, min: 0, max: 200 },
    { key: 'bowling_economy', label: 'Bowling Economy (rpo)', type: 'number', def: 6, min: 0, max: 20 },
    { key: 'catch_success', label: 'Catch Success (%)', type: 'number', def: 80, min: 0, max: 100 },
    { key: 'technique', label: 'Technique Rating', type: 'select', def: 'High', options: ['Low', 'Medium', 'High'] }
  ],
  Basketball: [
    { key: 'fg_pct', label: 'Field Goal (%)', type: 'number', def: 45, min: 0, max: 100 },
    { key: 'free_throw_pct', label: 'Free Throw (%)', type: 'number', def: 70, min: 0, max: 100 },
    { key: 'assists_per_game', label: 'Assists / Game', type: 'number', def: 3, min: 0, max: 50 },
    { key: 'defense', label: 'Defensive Rating', type: 'select', def: 'Medium', options: ['Low', 'Medium', 'High'] }
  ],
  Badminton: [
    { key: 'serve_accuracy', label: 'Serve Accuracy (%)', type: 'number', def: 70, min: 0, max: 100 },
    { key: 'smash_success', label: 'Smash Success (%)', type: 'number', def: 55, min: 0, max: 100 },
    { key: 'footwork', label: 'Footwork Rating', type: 'select', def: 'Medium', options: ['Low', 'Medium', 'High'] },
    { key: 'rally_endurance', label: 'Rally Endurance (avg shots)', type: 'number', def: 12, min: 0, max: 100 }
  ]
};
