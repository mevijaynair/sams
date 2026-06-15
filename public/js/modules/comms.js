// comms.js — automated parent report-card descriptors per channel.
import { api } from '../api.js';
import { store, toast } from '../store.js';
import { esc } from '../util.js';

const $ = (id) => document.getElementById(id);

function feeLine(s) {
  if (s.fee_plan_type === 'package') return `Package: ${s.package_remaining}/${s.package_sessions} sessions left`;
  if (s.fee_plan_type === 'per_session') return `Per-session plan at AED ${s.fee_rate}/session`;
  return `Monthly plan at AED ${s.fee_rate}/mo`;
}

function populateDropdown() {
  const sel = $('commsPlayerSelect');
  const prev = sel.value;
  const suffix = (s) => store.isSingleSport() ? '' : ` · ${esc(s.sport)}`;
  sel.innerHTML = '<option value="">Select student...</option>' +
    store.students.map(s => `<option value="${s.id}">${esc(s.name)}${suffix(s)}</option>`).join('');
  if (store.getStudent(prev)) sel.value = prev;
}

async function generate() {
  const id = $('commsPlayerSelect').value;
  if (!id) { $('commsPayload').value = ''; return; }
  const s = store.getStudent(id);
  const channel = $('commsChannel').value;

  let metricSummary = 'Evaluations pending';
  let streakLine = '';
  try {
    const [logs, att] = await Promise.all([api.evaluations(id), api.attendanceSummary(id)]);
    if (logs.length) metricSummary = Object.entries(logs[0].metrics).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (att.totalSessions) streakLine = `Attendance ${att.totalPresent}/${att.totalSessions} · streak ${att.streak}`;
  } catch (e) { toast(e.message, true); }

  const payDue = s.payment_status !== 'Paid'
    ? `Payment ${s.payment_status} — ${feeLine(s)}.`
    : 'Account in good standing. Thank you!';

  let text;
  if (channel === 'SMS') {
    text = `SAMS: ${s.name} (${s.sport}). ${streakLine || 'Attendance pending.'} ${
      s.payment_status !== 'Paid' ? `Payment ${s.payment_status}.` : 'Paid.'}`;
  } else if (channel === 'Email') {
    text =
`Subject: ${s.name} — Academy Progress Digest

Dear Parent / Guardian,

Progress digest for ${s.name}:
• Sport / Cohort: ${s.sport} · ${s.age_group}
• Compliance: EID ${s.eid_number || 'not on file'}
• ${streakLine || 'Attendance: none logged yet'}
• Performance: ${metricSummary}
• Billing: ${payDue}

Warm regards,
Academy Coaching & Admin`;
  } else {
    text =
`*SAMS Progress Brief* — ${s.name}
• ${s.sport} · ${s.age_group}
• ${streakLine || 'Attendance: none logged yet'}
• Performance: ${metricSummary}
• Billing: ${payDue}`;
  }
  $('commsPayload').value = text;
}

export function initComms() {
  $('commsPlayerSelect').addEventListener('change', generate);
  $('commsChannel').addEventListener('change', generate);
  $('commsCopy').addEventListener('click', async () => {
    const text = $('commsPayload').value;
    if (!text) return toast('Select a student first', true);
    try { await navigator.clipboard.writeText(text); toast('Payload copied'); }
    catch { $('commsPayload').select(); document.execCommand('copy'); toast('Payload copied'); }
  });
  $('commsWhatsApp').addEventListener('click', () => {
    const text = $('commsPayload').value;
    if (!text) return toast('Select a student first', true);
    window.open('https://web.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
  });
  store.subscribe(populateDropdown);
}
