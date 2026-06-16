// sportMetrics.js — SINGLE source of truth for every sport's performance model.
//
// Add a sport (or a metric) here and it flows automatically into:
//   • the Performance evaluation form (inputs, grouped by category)
//   • the per-player stat summary (bars + trend)
//   • the Squad Performance Matrix (columns = metrics flagged `key`)
//
// Metric definition:
//   key            unique id (stored in the evaluation JSON)
//   label          display name
//   type           'percent' | 'rating' | 'count' | 'number' | 'select'
//   unit           shown next to the value (percent/rating supply their own)
//   min,max,step   numeric bounds (used for inputs + bar normalisation)
//   options        for type 'select'
//   higherIsBetter default true; false flips the "good/bad" colour (e.g. economy)
//   def            default value pre-filled in a fresh evaluation
//   key            (flag) include this metric as a Squad Matrix column

export const SPORTS = ['Football', 'Cricket', 'Basketball', 'Badminton'];

export const SPORT_METRICS = {
  Football: {
    id: 'football',
    categories: [
      { name: 'Technical', metrics: [
        { key: 'passing_accuracy', label: 'Passing Accuracy', type: 'percent', def: 75, keyMetric: true },
        { key: 'first_touch', label: 'First Touch / Control', type: 'rating', def: 6 },
        { key: 'one_v_one_success', label: '1v1 Success Rate', type: 'percent', def: 60, keyMetric: true },
      ]},
      { name: 'Physical', metrics: [
        { key: 'high_intensity_sprints', label: 'High-Intensity Sprints', type: 'count', unit: 'per match', max: 80, def: 12 },
        { key: 'top_speed', label: 'Top Speed', type: 'number', unit: 'km/h', max: 40, step: 0.1, def: 24, keyMetric: true },
        { key: 'stamina', label: 'Stamina', type: 'rating', def: 6 },
      ]},
      { name: 'Tactical', metrics: [
        { key: 'positioning', label: 'Tactical Positioning', type: 'rating', def: 6, keyMetric: true },
        { key: 'decision_making', label: 'Decision Making', type: 'rating', def: 6 },
      ]},
    ],
  },

  Cricket: {
    id: 'cricket',
    categories: [
      { name: 'Batting', metrics: [
        { key: 'batting_average', label: 'Batting Average', type: 'number', unit: 'runs', max: 200, step: 0.1, def: 25, keyMetric: true },
        { key: 'strike_rate', label: 'Strike Rate', type: 'number', unit: 'runs/100b', max: 300, step: 0.1, def: 120, keyMetric: true },
      ]},
      { name: 'Bowling', metrics: [
        { key: 'bowling_economy', label: 'Bowling Economy', type: 'number', unit: 'rpo', max: 20, step: 0.1, def: 6, higherIsBetter: false, keyMetric: true },
        { key: 'line_length', label: 'Line & Length', type: 'rating', def: 6 },
      ]},
      { name: 'Fielding', metrics: [
        { key: 'catch_success', label: 'Catch Success', type: 'percent', def: 80, keyMetric: true },
        { key: 'run_outs', label: 'Run-Outs', type: 'count', unit: 'season', max: 50, def: 2 },
      ]},
    ],
  },

  Basketball: {
    id: 'basketball',
    categories: [
      { name: 'Shooting', metrics: [
        { key: 'field_goal_pct', label: 'Field Goal %', type: 'percent', def: 45, keyMetric: true },
        { key: 'free_throw_pct', label: 'Free Throw %', type: 'percent', def: 70, keyMetric: true },
        { key: 'three_point_pct', label: '3-Point %', type: 'percent', def: 33 },
      ]},
      { name: 'Playmaking', metrics: [
        { key: 'assists_per_game', label: 'Assists / Game', type: 'number', unit: 'apg', max: 30, step: 0.1, def: 3, keyMetric: true },
        { key: 'turnovers_per_game', label: 'Turnovers / Game', type: 'number', unit: 'tpg', max: 20, step: 0.1, def: 2, higherIsBetter: false },
      ]},
      { name: 'Defense', metrics: [
        { key: 'rebounds_per_game', label: 'Rebounds / Game', type: 'number', unit: 'rpg', max: 30, step: 0.1, def: 5, keyMetric: true },
        { key: 'defensive_rating', label: 'Defensive Rating', type: 'rating', def: 6 },
      ]},
    ],
  },

  Badminton: {
    id: 'badminton',
    categories: [
      { name: 'Technical', metrics: [
        { key: 'serve_accuracy', label: 'Serve Accuracy', type: 'percent', def: 70, keyMetric: true },
        { key: 'smash_success', label: 'Smash Success', type: 'percent', def: 55, keyMetric: true },
      ]},
      { name: 'Movement', metrics: [
        { key: 'footwork', label: 'Footwork', type: 'rating', def: 6, keyMetric: true },
        { key: 'court_coverage', label: 'Court Coverage', type: 'rating', def: 6 },
      ]},
      { name: 'Endurance', metrics: [
        { key: 'rally_endurance', label: 'Rally Endurance', type: 'count', unit: 'avg shots', max: 60, def: 12, keyMetric: true },
      ]},
    ],
  },
};

// ── Lookups ─────────────────────────────────────────────────────────────────

export function getSportMeta(sport) {
  return SPORT_METRICS[sport] || null;
}

// Categories (with their metric arrays) for a sport.
export function categoriesFor(sport) {
  return SPORT_METRICS[sport]?.categories || [];
}

// Flat list of every metric for a sport, each tagged with its category.
export function metricsFor(sport) {
  const out = [];
  for (const cat of categoriesFor(sport)) {
    for (const m of cat.metrics) out.push({ ...m, category: cat.name });
  }
  return out;
}

// The subset flagged for the Squad Matrix (falls back to the first few).
export function keyMetricsFor(sport, fallback = 4) {
  const all = metricsFor(sport);
  const keyed = all.filter(m => m.keyMetric);
  return keyed.length ? keyed : all.slice(0, fallback);
}

export function metricDef(sport, key) {
  return metricsFor(sport).find(m => m.key === key) || null;
}

// ── Formatting / normalisation ──────────────────────────────────────────────

function maxFor(def) {
  if (def.type === 'percent') return 100;
  if (def.type === 'rating') return 10;
  return def.max || 100;
}

// Human-readable value, e.g. "75%", "8/10", "24 km/h", "12".
export function formatValue(def, value) {
  if (value === undefined || value === null || value === '') return '—';
  if (def.type === 'percent') return `${value}%`;
  if (def.type === 'rating') return `${value}/10`;
  if (def.type === 'select') return String(value);
  return def.unit ? `${value} ${def.unit}` : String(value);
}

// 0..1 fill ratio for a progress bar.
export function normalize(def, value) {
  const v = parseFloat(value);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v / maxFor(def)));
}

// Rating options 0..10 for select rendering.
export const RATING_SCALE = Array.from({ length: 11 }, (_, i) => i);
