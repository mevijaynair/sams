// sportConfig.js — master sport/tier/metric matrix for SAMS multi-sport modularity
export const SPORT_CONFIG = {
  Football: {
    id: 'football',
    tiers: {
      'Grassroots (U6-U9)': {
        tierId: 'u6_u9',
        name: 'Grassroots · U6-U9',
        metrics: {
          agility_balance: { label: 'Agility / Balance', unit: 'score', type: 'number', min: 0, max: 10 },
          ball_manipulation_time: { label: 'Ball Manipulation Time', unit: 'seconds', type: 'number', min: 0, max: 300 }
        }
      },
      'Competitive (U14-U18)': {
        tierId: 'u14_u18',
        name: 'Competitive · U14-U18',
        metrics: {
          high_intensity_sprints: { label: 'High-Intensity Sprint Count', unit: 'per match', type: 'number', min: 0, max: 100 },
          tactical_positioning: { label: 'Tactical Positioning', unit: 'score', type: 'number', min: 0, max: 10 }
        }
      }
    }
  },
  Basketball: {
    id: 'basketball',
    tiers: {
      'Foundational (U8-U11)': {
        tierId: 'u8_u11',
        name: 'Foundational · U8-U11',
        metrics: {
          dribbling_mechanics: { label: 'Dribbling Mechanics', unit: 'score', type: 'number', min: 0, max: 10 },
          layup_completion_pct: { label: 'Layup Completion %', unit: '%', type: 'number', min: 0, max: 100 }
        }
      },
      'Elite (U15-U18)': {
        tierId: 'u15_u18',
        name: 'Elite · U15-U18',
        metrics: {
          free_throw_efficiency: { label: 'Free-Throw Efficiency', unit: '%', type: 'number', min: 0, max: 100 },
          defensive_rebound_tracking: { label: 'Defensive Rebound Tracking', unit: 'count', type: 'number', min: 0, max: 50 }
        }
      }
    }
  },
  Cricket: {
    id: 'cricket',
    tiers: {
      'Junior (U10-U13)': {
        tierId: 'u10_u13',
        name: 'Junior · U10-U13',
        metrics: {
          bowling_line_length: { label: 'Bowling Line & Length Score', unit: 'score', type: 'number', min: 0, max: 10 },
          catching_drills_success: { label: 'Catching Drills Success', unit: '%', type: 'number', min: 0, max: 100 }
        }
      },
      'Senior (U16-U19)': {
        tierId: 'u16_u19',
        name: 'Senior · U16-U19',
        metrics: {
          strike_rate: { label: 'Strike Rate Metric', unit: 'runs/ball', type: 'number', min: 0, max: 500, step: 0.1 },
          power_hitting_boundary_index: { label: 'Power-Hitting Boundary Index', unit: 'count', type: 'number', min: 0, max: 100 }
        }
      }
    }
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────
export function getTiersForSport(sportId) {
  const sport = Object.values(SPORT_CONFIG).find(s => s.id === sportId);
  if (!sport) return [];
  return Object.entries(sport.tiers).map(([key, tier]) => ({ key, ...tier }));
}

export function getMetricsForTier(sportId, tierId) {
  const sport = Object.values(SPORT_CONFIG).find(s => s.id === sportId);
  if (!sport) return {};
  const tier = Object.values(sport.tiers).find(t => t.tierId === tierId);
  return tier?.metrics || {};
}

export function getSportIdByName(sportName) {
  return SPORT_CONFIG[sportName]?.id || null;
}

export function getSportNameById(sportId) {
  return Object.keys(SPORT_CONFIG).find(name => SPORT_CONFIG[name].id === sportId) || null;
}
