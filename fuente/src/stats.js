import { e1rm, parseISO, toISO, weekStart, addDays, todayISO, weekKey } from './utils.js';

export const isWork = s => s.type !== 'W';

export function setVolume(s) { return isWork(s) ? (s.kg || 0) * (s.reps || 0) : 0; }
export function workoutVolume(w) { return w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + setVolume(s), 0), 0); }
export function workoutSets(w) { return w.exercises.reduce((a, e) => a + e.sets.filter(isWork).length, 0); }

export function sortedWorkouts(workouts) { return [...workouts].sort((a, b) => a.date.localeCompare(b.date) || (a.startedAt || 0) - (b.startedAt || 0)); }

// Sesiones de un ejercicio, de más antigua a más reciente
export function exerciseSessions(workouts, exId, excludeId) {
  const out = [];
  sortedWorkouts(workouts).forEach(w => {
    if (w.id === excludeId) return;
    w.exercises.forEach(e => { if (e.exId === exId && e.sets.length) out.push({ w, ex: e }); });
  });
  return out;
}

export function previousSets(workouts, exId, excludeId) {
  const s = exerciseSessions(workouts, exId, excludeId);
  return s.length ? s[s.length - 1].ex.sets : [];
}

export function bestSet(sets) {
  let best = null;
  sets.filter(isWork).forEach(s => { if (!best || e1rm(s.kg, s.reps) > e1rm(best.kg, best.reps)) best = s; });
  return best;
}

export function exerciseStats(workouts, manualRMs, exId, excludeId) {
  const sessions = exerciseSessions(workouts, exId, excludeId);
  const st = { sessions, maxKg: 0, maxKgDate: null, bestE1rm: 0, bestE1rmDate: null, bestE1rmSet: null, real1RM: null, repMax: {}, totalVolume: 0, totalSets: 0, maxReps: 0, lastDate: null };
  sessions.forEach(({ w, ex }) => {
    st.lastDate = w.date;
    ex.sets.filter(isWork).forEach(s => {
      st.totalSets++;
      st.totalVolume += s.kg * s.reps;
      if (s.reps > st.maxReps) st.maxReps = s.reps;
      if (s.kg > st.maxKg) { st.maxKg = s.kg; st.maxKgDate = w.date; }
      const e = e1rm(s.kg, s.reps);
      if (e > st.bestE1rm) { st.bestE1rm = e; st.bestE1rmDate = w.date; st.bestE1rmSet = s; }
      if (s.reps === 1 && s.kg > 0 && (!st.real1RM || s.kg > st.real1RM.kg)) st.real1RM = { kg: s.kg, date: w.date, manual: false };
      for (let r = 1; r <= Math.min(s.reps, 12); r++) {
        if (s.kg > 0 && (!st.repMax[r] || s.kg > st.repMax[r].kg)) st.repMax[r] = { kg: s.kg, reps: s.reps, date: w.date };
      }
    });
  });
  (manualRMs || []).filter(m => m.exId === exId).forEach(m => {
    if (!st.real1RM || m.kg > st.real1RM.kg) st.real1RM = { kg: m.kg, date: m.date, manual: true };
  });
  if (st.real1RM && (!st.repMax[1] || st.real1RM.kg > st.repMax[1].kg)) st.repMax[1] = { kg: st.real1RM.kg, reps: 1, date: st.real1RM.date, manual: st.real1RM.manual };
  if (st.real1RM && st.real1RM.kg > st.bestE1rm) { st.bestE1rm = st.real1RM.kg; st.bestE1rmDate = st.real1RM.date; }
  return st;
}

// Historial de récords de 1RM REALES (series de 1 repetición + registros manuales)
export function oneRMRecords(workouts, manualRMs) {
  const events = [];
  sortedWorkouts(workouts).forEach(w => w.exercises.forEach(e => e.sets.filter(isWork).forEach(s => {
    if (s.reps === 1 && s.kg > 0) events.push({ exId: e.exId, kg: s.kg, date: w.date, manual: false });
  })));
  (manualRMs || []).forEach(m => events.push({ exId: m.exId, kg: m.kg, date: m.date, manual: true, id: m.id }));
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.manual ? -1 : 1));
  const best = {};
  const prs = [];
  events.forEach(ev => {
    if (!best[ev.exId] || ev.kg > best[ev.exId].kg) { best[ev.exId] = ev; prs.push(ev); }
  });
  return { current: best, history: prs.reverse() };
}

// Semanas (lunes) desde hoy hacia atrás
export function lastWeeks(n) {
  const cur = weekStart(new Date());
  return Array.from({ length: n }, (_, i) => addDays(cur, -(n - 1 - i) * 7));
}

export function weeklySeries(workouts, n, metric) {
  const weeks = lastWeeks(n);
  const map = new Map(weeks.map(d => [toISO(d), 0]));
  workouts.forEach(w => {
    const k = weekKey(w.date);
    if (!map.has(k)) return;
    let v = 0;
    if (metric === 'volume') v = workoutVolume(w);
    else if (metric === 'workouts') v = 1;
    else if (metric === 'sets') v = workoutSets(w);
    else if (metric === 'duration') v = (w.duration || 0) / 60;
    map.set(k, map.get(k) + v);
  });
  return weeks.map(d => ({ date: toISO(d), value: Math.round(map.get(toISO(d)) * 10) / 10 }));
}

export function workoutsInRange(workouts, fromISO, toISO_ = todayISO()) {
  return workouts.filter(w => w.date >= fromISO && w.date <= toISO_);
}

export function muscleSets(workouts, getEx) {
  const m = {};
  workouts.forEach(w => w.exercises.forEach(e => {
    const n = e.sets.filter(isWork).length;
    if (!n) return;
    const mu = getEx(e.exId).muscle || 'Otro';
    m[mu] = (m[mu] || 0) + n;
  }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

// Rachas en semanas con al menos un entreno
export function weekStreaks(workouts, deloads = []) {
  const set = new Set(workouts.map(w => weekKey(w.date)));
  deloads.forEach(d => set.add(d));
  let cur = 0;
  let d = weekStart(new Date());
  if (!set.has(toISO(d))) d = addDays(d, -7); // la semana actual aún puede estar en curso
  while (set.has(toISO(d))) { cur++; d = addDays(d, -7); }
  const keys = [...set].sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(k => {
    if (prev && toISO(addDays(parseISO(prev), 7)) === k) run++; else run = 1;
    best = Math.max(best, run); prev = k;
  });
  return { current: cur, best: Math.max(best, cur) };
}

// Semanas seguidas entrenando desde la última descarga
export function weeksSinceDeload(workouts, deloads = []) {
  const trained = new Set(workouts.map(w => weekKey(w.date)));
  const dl = new Set(deloads);
  const cur = toISO(weekStart(new Date()));
  // semanas entrenadas en modo descarga también cuentan como descarga (salvo la actual, que la marca el usuario)
  workouts.forEach(w => { if (w.deload && weekKey(w.date) !== cur) dl.add(weekKey(w.date)); });
  let d = weekStart(new Date());
  if (dl.has(toISO(d))) return { weeks: 0, inDeload: true };
  if (!trained.has(toISO(d))) d = addDays(d, -7);
  let n = 0;
  while (trained.has(toISO(d)) && !dl.has(toISO(d))) { n++; d = addDays(d, -7); }
  // incluir la semana actual si ya se ha entrenado
  return { weeks: n, inDeload: false };
}

export function workoutPRs(workout, workouts, manualRMs) {
  const prs = [];
  workout.exercises.forEach(e => {
    const st = exerciseStats(workouts, manualRMs, e.exId, workout.id);
    if (!st.sessions.length) return;
    const work = e.sets.filter(isWork);
    const maxKg = Math.max(0, ...work.map(s => s.kg));
    if (maxKg > st.maxKg) prs.push({ exId: e.exId, kind: 'peso', kg: maxKg });
    const singles = work.filter(s => s.reps === 1).map(s => s.kg);
    const best1 = singles.length ? Math.max(...singles) : 0;
    if (best1 > 0 && (!st.real1RM || best1 > st.real1RM.kg)) prs.push({ exId: e.exId, kind: '1rm', kg: best1 });
  });
  return prs;
}
