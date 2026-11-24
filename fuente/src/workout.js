import { getState, setState, getActive, setActive, getExercise } from './store.js';
import { previousSets, workoutPRs, weeksSinceDeload, isWork } from './stats.js';
import { increment } from './plan.js';
import { BASE_LIFTS, startingLoad, roundLoad } from './coach.js';
import { coachTargetText, queueUpload } from './coachProgram.js';
import { uid, todayISO, toUnit, fromUnit, parseNum, roundTo, fmtNum } from './utils.js';

const txt = (kg, unit) => (kg || kg === 0) && kg !== '' ? fmtNum(roundTo(toUnit(kg, unit), unit === 'lb' ? 1 : 0.25), 2).replace(/\./g, '') : '';
// fmtNum en es-ES usa coma decimal y punto de miles; para inputs quitamos separador de miles
export const kgText = (kg, unit) => txt(kg, unit);

function newSet(from, unit, factor = 1) {
  return {
    uid: uid('s'),
    type: from?.type === 'W' ? 'W' : 'N',
    kg: from && from.kg ? kgText(factor === 1 ? from.kg : roundTo(from.kg * factor, 2.5), unit) : '',
    reps: from && from.reps ? String(from.reps) : '',
    rir: '',
    done: false,
  };
}

export function isDeloadWeek(s = getState()) {
  return weeksSinceDeload(s.workouts, s.deloads).inDeload;
}

function buildExercise(exId, count, s, unit, factor, rest, target, plan) {
  const prev = previousSets(s.workouts, exId);
  const base = { uid: uid('e'), exId, rest: rest ?? s.settings.defaultRest, notes: '' };
  if (!target || !target.repMin) {
    // si hay sesión anterior se copia su estructura completa (calentamientos incluidos); si no, las series de la rutina
    const n = Math.max(1, prev.length || count || 3);
    return { ...base, sets: Array.from({ length: n }, (_, i) => newSet(prev[i] || prev[prev.length - 1], unit, factor)) };
  }
  // Programa del entrenador: peso y reps exactos de cada serie, sin progresión automática
  if (target.coachSets && target.coachSets.length) {
    const cs = target.coachSets;
    const sets = cs.map(x => ({ ...newSet(null, unit), kg: x.kg > 0 ? kgText(x.kg, unit) : '', reps: String(x.min) }));
    const coach = [`Objetivo: ${coachTargetText(cs)}`, target.coachNote].filter(Boolean).join('. ');
    return { ...base, sets, target: { min: target.repMin, max: target.repMax }, suggest: null, suggestFrom: null, coach, coachSets: cs };
  }
  // Con objetivo (planes): el entrenador rellena peso y repeticiones de cada serie de trabajo
  const warm = prev.filter(x => x.type === 'W');
  const work = prev.filter(x => x.type !== 'W');
  const n = Math.max(1, count || work.length || 3);
  const scaled = kg => factor === 1 ? kg : roundLoad(exId, kg * factor);
  let suggest = null, coach = null;
  const topKg = work.length ? Math.max(...work.map(x => x.kg || 0)) : 0;
  let rows; // [{kg, reps}]
  if (work.length) {
    const atTop = work.filter(x => x.kg === topKg);
    if (factor === 1 && topKg > 0 && atTop.every(x => x.reps >= target.repMax)) {
      suggest = topKg + increment(exId, topKg);
      rows = Array.from({ length: n }, () => ({ kg: suggest, reps: target.repMin }));
    } else {
      rows = Array.from({ length: n }, (_, i) => {
        const from = work[i] || work[work.length - 1];
        const reps = factor === 1 && from.reps >= target.repMin ? Math.min(from.reps + 1, target.repMax) : target.repMin;
        return { kg: from.kg > 0 ? scaled(from.kg) : 0, reps };
      });
    }
  } else {
    const st = startingLoad(exId, plan && plan.lifts, target.repMin, plan && plan.level);
    if (st) {
      const lift = BASE_LIFTS.find(l => l.key === st.lift);
      const known = plan.known && plan.known.includes(st.lift);
      coach = known ? `Primera vez: peso calculado con tu marca en ${lift.label.toLowerCase()}. Ajústalo si no te encaja.` : 'Primera vez: peso estimado para tu nivel. Ajústalo si no te encaja.';
    }
    rows = Array.from({ length: n }, () => ({ kg: st ? scaled(st.kg) : 0, reps: target.repMin }));
  }
  const sets = [
    ...warm.map(w => newSet(w, unit, factor)),
    ...rows.map(r => ({ ...newSet(null, unit), kg: r.kg > 0 ? kgText(r.kg, unit) : '', reps: String(r.reps) })),
  ];
  return { ...base, sets, target: { min: target.repMin, max: target.repMax }, suggest, suggestFrom: suggest ? topKg : null, coach };
}

export function startWorkout({ routineId = null, fromWorkout = null } = {}) {
  const s = getState();
  const unit = s.settings.unit;
  const deload = isDeloadWeek(s);
  let factor = deload ? 0.6 : 1;
  let name = 'Entreno libre', exercises = [];
  if (routineId) {
    const r = s.routines.find(x => x.id === routineId);
    name = r.name;
    const plan = s.plan && r.planId === s.plan.id ? s.plan : null;
    if (plan && plan.coach) { factor = 1; }
    exercises = r.exercises.map(e => buildExercise(e.exId, e.sets, s, unit, factor, e.rest, e.repMin ? e : null, plan));
  } else if (fromWorkout) {
    name = fromWorkout.name;
    exercises = fromWorkout.exercises.map(e => buildExercise(e.exId, e.sets.length, s, unit, factor));
  }
  setActive({
    id: uid('w_'), routineId, name, date: todayISO(), startedAt: Date.now(), unit,
    exercises, restEndsAt: null, restTotal: 0, minimized: false, deload: factor !== 1,
  });
}

export function editWorkout(w) {
  const unit = getState().settings.unit;
  setActive({
    id: w.id, editing: true, routineId: w.routineId, name: w.name, date: w.date, startedAt: w.startedAt, duration: w.duration, unit, notes: w.notes || '',
    exercises: w.exercises.map(e => ({
      uid: uid('e'), exId: e.exId, rest: getState().settings.defaultRest, notes: e.notes || '',
      sets: e.sets.map(x => ({ uid: uid('s'), type: x.type || 'N', kg: kgText(x.kg, unit), reps: String(x.reps || ''), rir: x.rir ?? '', done: true })),
    })),
    restEndsAt: null, minimized: false,
  });
}

export function makeExercise(exId) {
  const s = getState();
  return buildExercise(exId, 3, s, s.settings.unit, isDeloadWeek(s) ? 0.6 : 1);
}

export function setHasData(x) {
  return (parseNum(x.kg) > 0) || (parseNum(x.reps) > 0);
}

export function activeCounts(a) {
  let done = 0, pendingWithData = 0, total = 0;
  a.exercises.forEach(e => e.sets.forEach(x => { total++; if (x.done) done++; else if (setHasData(x)) pendingWithData++; }));
  return { done, pendingWithData, total };
}

// mode: 'done' = solo series marcadas; 'all' = marca también las que tienen datos
export function activeToWorkout(a, mode = 'done') {
  const unit = a.unit;
  const exercises = a.exercises.map(e => ({
    exId: e.exId,
    notes: e.notes || '',
    sets: e.sets
      .filter(x => mode === 'all' ? (x.done || setHasData(x)) : x.done)
      .map(x => ({
        type: x.type || 'N',
        kg: Math.max(0, fromUnit(parseNum(x.kg) || 0, unit)),
        reps: Math.max(0, Math.round(parseNum(x.reps) || 0)),
        rir: x.rir === '' || x.rir === null || x.rir === undefined || isNaN(parseNum(x.rir)) ? null : parseNum(x.rir),
      }))
      .filter(x => x.kg > 0 || x.reps > 0),
  })).filter(e => e.sets.length);
  return {
    id: a.id,
    routineId: a.routineId,
    name: (a.name || 'Entreno').trim() || 'Entreno',
    date: a.date || todayISO(),
    startedAt: a.startedAt || null,
    duration: a.editing ? a.duration : Math.round((Date.now() - a.startedAt) / 1000),
    notes: a.notes || '',
    deload: !!a.deload,
    exercises,
  };
}

export function saveActive(mode) {
  const a = getActive();
  const w = activeToWorkout(a, mode);
  const s = getState();
  if (!w.exercises.length) return null;
  const prs = a.editing ? [] : workoutPRs(w, s.workouts, s.manualRMs);
  setState(st => ({
    ...st,
    workouts: a.editing ? st.workouts.map(x => x.id === w.id ? w : x) : [...st.workouts, w],
  }));
  setActive(null);
  queueUpload(w.id);
  return { workout: w, prs, editing: !!a.editing };
}

export function routineDiff(w, s = getState()) {
  if (!w.routineId) return null;
  const r = s.routines.find(x => x.id === w.routineId);
  if (!r) return null;
  const a = r.exercises.map(e => `${e.exId}:${e.sets}`).join('|');
  const b = w.exercises.map(e => { const re = r.exercises.find(x => x.exId === e.exId); return `${e.exId}:${re && re.repMin ? e.sets.filter(isWork).length : e.sets.length}`; }).join('|');
  return a === b ? null : r;
}

export function updateRoutineFromWorkout(w) {
  setState(st => ({
    ...st,
    routines: st.routines.map(r => r.id !== w.routineId ? r : {
      ...r,
      exercises: w.exercises.map(e => { const old = r.exercises.find(x => x.exId === e.exId) || {}; return { ...old, exId: e.exId, sets: old.repMin ? e.sets.filter(isWork).length : e.sets.length, rest: old.rest ?? st.settings.defaultRest }; }),
    }),
  }));
}

export function routineFromWorkout(w, name) {
  const r = { id: uid('r_'), name: name || w.name, notes: '', exercises: w.exercises.map(e => ({ exId: e.exId, sets: e.sets.length, rest: getState().settings.defaultRest })) };
  setState(st => ({ ...st, routines: [...st.routines, r] }));
  return r;
}

export function exName(id) { return getExercise(id).name; }
