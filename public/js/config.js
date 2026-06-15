// config.js — age-group developmental metric matrices (the "Pitch" module).
// Each entry: { key (stored), label (shown), type, default, min, max }.
export const AGE_METRICS = {
  'U6-U9': [
    { key: 'fundamental_movement', label: 'Fundamental Movement Skills (1-10)', type: 'number', def: 7, min: 1, max: 10 },
    { key: 'ball_manipulation_mins', label: 'Ball Manipulation Time (mins)', type: 'number', def: 25, min: 0, max: 120 },
    { key: 'agility_balance_coord', label: 'ABC Agility / Balance / Coordination (1-10)', type: 'number', def: 6, min: 1, max: 10 }
  ],
  'U10-U13': [
    { key: 'passing_accuracy', label: 'Passing Accuracy (%)', type: 'number', def: 75, min: 0, max: 100 },
    { key: 'one_v_one_success', label: '1v1 Technical Success Rate (%)', type: 'number', def: 60, min: 0, max: 100 },
    { key: 'juggling_reps', label: 'Juggling Threshold (reps)', type: 'number', def: 30, min: 0, max: 1000 }
  ],
  'U14-U18': [
    { key: 'sprint_counts', label: 'High-Intensity Sprint Counts', type: 'number', def: 12, min: 0, max: 200 },
    { key: 'tactical_positioning', label: 'Tactical Positioning Rating', type: 'select', def: 'High', options: ['Low', 'Medium', 'High'] },
    { key: 'match_minutes', label: 'Match-Play Minutes', type: 'number', def: 60, min: 0, max: 200 }
  ]
};

export const AGE_LABELS = {
  'U6-U9': 'Grassroots (U6-U9)',
  'U10-U13': 'Development (U10-U13)',
  'U14-U18': 'Competitive (U14-U18)'
};
