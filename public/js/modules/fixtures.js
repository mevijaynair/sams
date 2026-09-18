// modules/fixtures.js — match fixtures, results, and W-D-L record.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0, 10);

// Home/Away/Neutral badge
const venueBadge = (v) => `<span class="venue-badge venue-${(v || 'Home').toLowerCase()}">${esc(v || 'Home')}</span>`;

// Win/Draw/Loss from our vs opponent score
function resultOf(f) {
  if (f.our_score == null || f.opp_score == null) return null;
  if (f.our_score > f.opp_score) return 'W';
  if (f.our_score < f.opp_score) return 'L';
  return 'D';
}

function fmtDate(d) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return d; }
}

export function initFixtures() {
  const form = $('fixtureForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        opponent: $('fx_opponent').value.trim(),
        match_date: $('fx_date').value,
        kickoff: $('fx_kickoff').value || '',
        venue: $('fx_venue').value,
        competition: $('fx_competition').value,
        age_group: $('fx_age').value,
        sport: store.academySport(),
      };
      if (!body.opponent) return toast('Opponent is required', true);
      if (!body.match_date) return toast('Match date is required', true);
      try {
        await api.createFixture(body);
        toast('Fixture added');
        form.reset();
        loadFixtures();
      } catch (err) { toast(err.message, true); }
    });
  }
  // reload when the super admin switches academy
  window.addEventListener('sams:tenant', () => { if (!$('fixtures')?.hidden) loadFixtures(); });
}

export async function loadFixtures() {
  let fixtures;
  try { fixtures = await api.fixtures(); } catch (e) { return toast(e.message, true); }

  const today = todayISO();
  const upcoming = fixtures
    .filter(f => f.status === 'Scheduled' && f.match_date >= today)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));
  const results = fixtures
    .filter(f => f.status === 'Played' || (f.status === 'Scheduled' && f.match_date < today))
    .sort((a, b) => b.match_date.localeCompare(a.match_date));

  renderUpcoming(upcoming);
  renderResults(results);
}

function renderUpcoming(list) {
  const el = $('fxUpcoming');
  $('fxUpcomingCount').textContent = list.length ? `${list.length} scheduled` : '';
  if (!list.length) { el.innerHTML = '<p class="hint">No upcoming fixtures. Schedule one above.</p>'; return; }
  el.innerHTML = list.map(f => `
    <div class="fixture-row" data-id="${f.id}">
      <div class="fx-date"><span class="fx-day">${fmtDate(f.match_date)}</span>
        <span class="fx-time">${f.kickoff ? esc(f.kickoff) : '—'}</span></div>
      <div class="fx-main">
        <div class="fx-opp">vs ${esc(f.opponent)} ${venueBadge(f.venue)}</div>
        <div class="fx-meta">${esc(f.competition || 'Friendly')}${f.age_group ? ' · ' + esc(f.age_group) : ''}</div>
      </div>
      <div class="fx-actions" data-perm="fixtures:write">
        <button class="btn-secondary btn-sm fx-log">Log result</button>
        <button class="btn-danger btn-sm fx-del">Delete</button>
      </div>
    </div>`).join('');
  wireRowActions(el, true);
}

function renderResults(list) {
  const el = $('fxResults');
  const played = list.filter(f => resultOf(f));
  const w = played.filter(f => resultOf(f) === 'W').length;
  const d = played.filter(f => resultOf(f) === 'D').length;
  const l = played.filter(f => resultOf(f) === 'L').length;
  $('fxRecord').textContent = played.length ? `${w}W · ${d}D · ${l}L` : '';
  if (!list.length) { el.innerHTML = '<p class="hint">No results logged yet.</p>'; return; }
  el.innerHTML = list.map(f => {
    const r = resultOf(f);
    const score = r ? `${f.our_score}–${f.opp_score}` : 'Result pending';
    return `
    <div class="fixture-row result" data-id="${f.id}">
      <div class="fx-date"><span class="fx-day">${fmtDate(f.match_date)}</span></div>
      <div class="fx-main">
        <div class="fx-opp">vs ${esc(f.opponent)} ${venueBadge(f.venue)}</div>
        <div class="fx-meta">${esc(f.competition || 'Friendly')}${f.age_group ? ' · ' + esc(f.age_group) : ''}</div>
      </div>
      <div class="fx-score">
        ${r ? `<span class="result-pill result-${r}">${r}</span>` : ''}
        <span class="scoreline">${esc(score)}</span>
      </div>
      <div class="fx-actions" data-perm="fixtures:write">
        <button class="btn-secondary btn-sm fx-log">Edit</button>
        <button class="btn-danger btn-sm fx-del">Delete</button>
      </div>
    </div>`;
  }).join('');
  wireRowActions(el, false);
}

function wireRowActions(container, upcoming) {
  // apply the write-permission gate to freshly-rendered controls
  container.querySelectorAll('[data-perm]').forEach(x => { x.hidden = !store.can(x.dataset.perm); });

  container.querySelectorAll('.fx-del').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.target.closest('.fixture-row').dataset.id;
    if (!confirm('Delete this fixture?')) return;
    try { await api.deleteFixture(id); toast('Fixture deleted'); loadFixtures(); }
    catch (err) { toast(err.message, true); }
  }));

  container.querySelectorAll('.fx-log').forEach(b => b.addEventListener('click', (e) => {
    const row = e.target.closest('.fixture-row');
    openScoreEntry(row);
  }));
}

// Inline score entry inside a fixture row.
function openScoreEntry(row) {
  const id = row.dataset.id;
  const actions = row.querySelector('.fx-actions');
  if (row.querySelector('.score-entry')) return; // already open
  const box = document.createElement('div');
  box.className = 'score-entry';
  box.innerHTML = `
    <input class="se-our" type="number" min="0" max="99" placeholder="Us" inputmode="numeric">
    <span class="se-dash">–</span>
    <input class="se-opp" type="number" min="0" max="99" placeholder="Opp" inputmode="numeric">
    <button class="btn btn-sm se-save">Save</button>
    <button class="btn-secondary btn-sm se-cancel">Cancel</button>`;
  actions.hidden = true;
  row.appendChild(box);
  const our = box.querySelector('.se-our'); our.focus();
  box.querySelector('.se-cancel').addEventListener('click', () => { box.remove(); actions.hidden = false; });
  box.querySelector('.se-save').addEventListener('click', async () => {
    const os = parseInt(box.querySelector('.se-our').value, 10);
    const ps = parseInt(box.querySelector('.se-opp').value, 10);
    if (Number.isNaN(os) || Number.isNaN(ps)) return toast('Enter both scores', true);
    try {
      await api.updateFixture(id, { our_score: os, opp_score: ps, status: 'Played' });
      toast('Result saved');
      loadFixtures();
    } catch (err) { toast(err.message, true); }
  });
}
