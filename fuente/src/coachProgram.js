// Programa del entrenador: se descarga de ./programa.json (en el mismo repositorio de GitHub)
// y se convierte en el plan activo con sus rutinas. Las series traen peso, reps y RIR objetivo.
import { getState, setState, getExercise } from './store.js';
import { todayISO, fmtNum } from './utils.js';

export const COACH_PLAN_ID = 'coach';
const rid = id => `coach_${id}`;

const repRange = r => Array.isArray(r) ? [Number(r[0]), Number(r[r.length - 1])] : [Number(r), Number(r)];

export function applyProgram(p) {
  setState(st => {
    const routines = p.sesiones.map(ses => ({
      id: rid(ses.id),
      name: ses.nombre,
      notes: 'Programa del entrenador',
      planId: COACH_PLAN_ID,
      exercises: ses.ejercicios.map(e => {
        const series = e.series.map(x => { const [min, max] = repRange(x.reps); return { kg: Number(x.kg) || 0, min, max, rir: x.rir ?? null }; });
        return {
          exId: e.id,
          sets: series.length,
          rest: e.descanso ?? 120,
          repMin: Math.min(...series.map(x => x.min)),
          repMax: Math.max(...series.map(x => x.max)),
          role: 'acc',
          coachSets: series,
          coachNote: e.nota || '',
        };
      }),
    }));
    const prev = st.plan || {};
    const plan = {
      id: COACH_PLAN_ID,
      coach: true,
      name: 'Programa del entrenador',
      goal: 'hipertrofia', level: 'avanzado', equip: 'gym', split: 'coach', days: p.sesiones.length, priorities: [],
      lifts: prev.lifts, known: prev.known,
      schedule: p.sesiones.map(ses => ({ weekday: ses.dia, routineId: rid(ses.id) })).sort((a, b) => a.weekday - b.weekday),
      deloadEvery: 1000,
      startDate: p.inicio || todayISO(),
      createdAt: todayISO(),
      note: p.nota || '',
      updated: p.actualizado,
    };
    // Las rutinas del entrenador se sustituyen; las demás rutinas del usuario se conservan.
    // Las rutinas de un plan antiguo pasan a ser rutinas normales.
    const others = st.routines
      .filter(r => r.planId !== COACH_PLAN_ID)
      .map(r => r.planId && r.planId !== COACH_PLAN_ID ? { ...r, planId: undefined } : r);
    return { ...st, plan, routines: [...routines, ...others], coachProgram: { updated: p.actualizado } };
  });
}

// Devuelve el programa si había uno nuevo y se ha aplicado; null si no hay cambios o no hay red.
export async function syncProgram() {
  try {
    const res = await fetch(`./programa.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const p = await res.json();
    if (!p || !Array.isArray(p.sesiones)) return null;
    const s = getState();
    if (s.coachProgram && s.coachProgram.updated === p.actualizado && s.plan && s.plan.coach) return null;
    applyProgram(p);
    return p;
  } catch (e) {
    return null;
  }
}

// Texto de las series objetivo de un ejercicio del programa, p. ej. "1×90 kg 8-10 (RIR 1) · 2×75 kg 8-10 (RIR 1-2)"
export function coachTargetText(coachSets) {
  const groups = [];
  coachSets.forEach(x => {
    const key = `${x.kg}|${x.min}|${x.max}|${x.rir}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.n++;
    else groups.push({ key, n: 1, x });
  });
  return groups.map(({ n, x }) => {
    const reps = x.min === x.max ? `${x.min}` : `${x.min}-${x.max}`;
    const kg = x.kg > 0 ? `${fmtNum(x.kg, 2)} kg ` : '';
    return `${n}×${kg}${reps}${x.rir !== null && x.rir !== '' ? ` (RIR ${x.rir})` : ''}`;
  }).join(' · ');
}

// Resumen en texto para pegar en el chat del entrenador
export function workoutToCoachText(w, s = getState()) {
  const d = new Date(w.date + 'T12:00:00');
  const fecha = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
  const mins = w.duration ? ` · ${Math.round(w.duration / 60)} min` : '';
  const lines = [`FitLog · ${w.name} · ${fecha}${mins}`];
  w.exercises.forEach(e => {
    const sets = e.sets.map(x => {
      const kg = x.kg > 0 ? `${fmtNum(x.kg, 2)}` : 'PC';
      const rir = x.rir !== null && x.rir !== undefined ? ` RIR${x.rir}` : '';
      const tipo = x.type === 'W' ? ' (calent.)' : x.type === 'D' ? ' (drop)' : x.type === 'F' ? ' (fallo)' : '';
      return `${kg}×${x.reps}${rir}${tipo}`;
    }).join(', ');
    lines.push(`- ${getExercise(e.exId, s).name}: ${sets}${e.notes ? ` · nota: ${e.notes}` : ''}`);
  });
  if (w.notes) lines.push(`Notas: ${w.notes}`);
  return lines.join('\n');
}

export async function copyForCoach(w) {
  const text = workoutToCoachText(w);
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    try { if (navigator.share) { await navigator.share({ text }); return 'shared'; } } catch (err) { return null; }
  }
  return null;
}

// ---------- Envío automático de entrenos al repositorio (para el entrenador) ----------
const REPO = 'pablopareja18/fitlog';
const TOKEN_KEY = 'fitlog_gh_token'; // fuera del estado: no sale en las copias exportadas
const QUEUE_KEY = 'fitlog_upload_queue';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
export const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t.trim()) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
const getQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; } };
const setQueue = q => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {} };
export const pendingUploads = () => getQueue().length;

const b64 = str => btoa(unescape(encodeURIComponent(str)));
const api = (path, opts = {}) => fetch(`https://api.github.com/repos/${REPO}${path ? `/${path}` : ""}`, {
  ...opts,
  headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) },
});

export async function checkToken() {
  try { const r = await api(''); if (!r.ok) return false; const j = await r.json(); return !!(j.permissions && j.permissions.push); } catch (e) { return false; }
}

function workoutPayload(w, s) {
  const r = w.routineId && s.routines.find(x => x.id === w.routineId);
  return {
    fecha: w.date,
    sesion: w.name,
    rutina: w.routineId || null,
    programa: s.coachProgram ? s.coachProgram.updated : null,
    duracionMin: w.duration ? Math.round(w.duration / 60) : null,
    notas: w.notes || '',
    ejercicios: w.exercises.map(e => {
      const re = r && r.exercises.find(x => x.exId === e.exId);
      return {
        id: e.exId,
        nombre: getExercise(e.exId, s).name,
        notas: e.notes || '',
        objetivo: re && re.coachSets ? re.coachSets : null,
        series: e.sets.map(x => ({ tipo: x.type || 'N', kg: x.kg, reps: x.reps, rir: x.rir ?? null })),
      };
    }),
    resumen: workoutToCoachText(w, s),
  };
}

async function uploadOne(id) {
  const s = getState();
  const w = s.workouts.find(x => x.id === id);
  if (!w) return true; // borrado: nada que subir
  const path = `entrenos/${w.date}_${w.id}.json`;
  let sha;
  const g = await api(`contents/${path}`);
  if (g.ok) sha = (await g.json()).sha;
  else if (g.status !== 404) return false;
  const res = await api(`contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message: `Entreno ${w.date} · ${w.name}`, content: b64(JSON.stringify(workoutPayload(w, s), null, 2)), ...(sha ? { sha } : {}) }),
  });
  return res.ok;
}

let flushing = false;
export async function flushUploads() {
  if (flushing || !getToken()) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const id of getQueue()) {
      let ok = false;
      try { ok = await uploadOne(id); } catch (e) { ok = false; }
      if (!ok) break; // sin red o sin permiso: se reintenta más tarde
      setQueue(getQueue().filter(x => x !== id));
      sent++;
    }
  } finally { flushing = false; }
  return sent;
}

export function queueUpload(id) {
  setQueue([...getQueue().filter(x => x !== id), id]);
  return flushUploads();
}
