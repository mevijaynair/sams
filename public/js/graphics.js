// graphics.js — sports-themed SVG icons + decorative graphics.
// Icons inherit color via currentColor so they pick up the active sport accent.

const ICONS = {
  football: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9.2"/>
    <path d="M12 6.6l3.1 2.3-1.2 3.7h-3.8L8.9 8.9 12 6.6z"/>
    <path d="M12 6.6V3.2M15.1 8.9l3.1-1M13.9 12.6l2 3.1M10.1 12.6l-2 3.1M8.9 8.9l-3.1-1"/>
  </svg>`,

  cricket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="8" cy="16" r="4.4"/>
    <path d="M6 14.4c1.4-.5 2.8-.4 4 .6M6.6 17.8c1.2-.7 2.5-.9 3.9-.5"/>
    <path d="M13.2 11.6L20 4.8M18.3 3l2.7 2.7-1.6 1.6-2.7-2.7L18.3 3z"/>
  </svg>`,

  basketball: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9.2"/>
    <path d="M12 2.8v18.4M2.8 12h18.4"/>
    <path d="M5.5 5.5c2.6 1.9 4.2 4.5 4.2 6.5s-1.6 4.6-4.2 6.5M18.5 5.5c-2.6 1.9-4.2 4.5-4.2 6.5s1.6 4.6 4.2 6.5"/>
  </svg>`,

  badminton: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.5 9.5l-9 9M5.5 18.5l-1.8.3.3-1.8M8 16l-2 2M16 8l-2 2"/>
    <path d="M14.5 9.5l1.8-5.4 3.6 3.6-5.4 1.8z"/>
    <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor"/>
  </svg>`,

  tennis: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9.2"/>
    <path d="M4.6 6.2c3.6 1.6 5.8 4.9 5.8 8.4 0 2-.7 3.9-1.9 5.4M19.4 6.2c-3.6 1.6-5.8 4.9-5.8 8.4 0 2 .7 3.9 1.9 5.4"/>
  </svg>`,

  swimming: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="6.5" r="1.8"/>
    <path d="M3 14.5c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2"/>
    <path d="M5 12l4.5-2.7 3 1.8 3.5-1.1"/>
  </svg>`,

  volleyball: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9.2"/>
    <path d="M12 2.8c-3 3-4 8-2.5 12.5M12 2.8c3 3 4 8 2.5 12.5M3.2 9.5c4 .8 8.5 3 11 7M20.8 9.5c-4 .8-8.5 3-11 7"/>
  </svg>`,

  // generic fallback — trophy
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/>
    <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3"/>
    <path d="M10 13.5V17h4v-3.5M8.5 20.5h7M12 17v3.5"/>
  </svg>`
};

const ALL_SPORTS = ['football', 'cricket', 'basketball', 'badminton', 'tennis', 'swimming', 'volleyball'];

export function sportKey(sport) {
  return String(sport || '').toLowerCase().trim();
}

// Returns an SVG markup string for a sport, sized to `size` px.
export function sportIcon(sport, size = 24) {
  const key = sportKey(sport);
  const svg = ICONS[key] || ICONS.default;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

// All sport classes we may apply to <body> (for cleanup before re-applying).
export function allSportClasses() {
  return ALL_SPORTS.map(s => `sport-${s}`);
}

// A subtle decorative field-line pattern for hero/login backdrops.
export function fieldPattern() {
  return `<svg class="field-deco" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle cx="200" cy="100" r="46" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="200" y1="0" x2="200" y2="200" stroke="currentColor" stroke-width="1.5"/>
    <rect x="0" y="55" width="46" height="90" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="354" y="55" width="46" height="90" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="200" cy="100" r="3" fill="currentColor"/>
  </svg>`;
}
