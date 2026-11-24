import { useSyncExternalStore } from 'react';
import { LIBRARY_BY_ID, findLibraryIdByName } from './exercises.js';
import { uid, todayISO } from './utils.js';

export const KEY = 'fitlog_v3';
const ACTIVE_KEY = 'fitlog_active_v3';
const OLD_KEY = 'fitlog_v2';

export function freshState() {
  return {
    version: 3,
    settings: { name: '', unit: 'kg', defaultRest: 120, sound: true },
    customExercises: [],
    routines: [],
    workouts: [],
    bodyLog: [],
    photos: [],
    manualRMs: [],
    deloads: [],
    deloadSnoozeUntil: null,
    plan: null,
    onboardingDone: false,
    createdAt: todayISO(),
  };
}

const GROUP_TO_MUSCLE = { Torso: 'Pecho', Piernas: 'Cuádriceps', Brazos: 'Bíceps', Hombros: 'Hombros', Core: 'Abdomen', Cardio: 'Otro', Otro: 'Otro' };

// Convierte los datos de la versión anterior (fitlog_v2) sin perder nada
export function migrateV2(old) {
  const s = freshState();
  const custom = [];
  const byName = new Map();

  const resolve = (name, group) => {
    const key = (name || '').trim();
    if (!key) return null;
    if (byName.has(key.toLowerCase())) return byName.get(key.toLowerCase());
    let id = findLibraryIdByName(key);
    if (!id) {
      id = uid('c_');
      custom.push({ id, name: key, muscle: GROUP_TO_MUSCLE[group] || 'Otro', equipment: 'Otro', custom: true });
    }
    byName.set(key.toLowerCase(), id);
    return id;
  };

  // Grupo de cada ejercicio según las rutinas antiguas
  const groupOf = {};
  (old.routines || []).forEach(r => (r.exercises || []).forEach(e => { if (e && e.name) groupOf[e.name] = e.group; }));

  s.routines = (old.routines || []).map(r => ({
    id: r.id || uid('r_'),
    name: r.name || 'Rutina',
    notes: r.days || '',
    exercises: (r.exercises || []).map(e => {
      const exId = resolve(e.name, e.group);
      return exId ? { exId, sets: 3, rest: 120 } : null;
    }).filter(Boolean),
  }));

  s.workouts = (old.sessions || []).map(ses => {
    const exercises = Object.entries(ses.sets || {}).map(([name, arr]) => {
      const exId = resolve(name, groupOf[name]);
      const sets = (arr || []).map(x => ({
        type: 'N',
        kg: Number(x.kg) || 0,
        reps: Number(x.reps) || 0,
        rir: x.rir === null || x.rir === undefined || x.rir === '' ? null : Number(x.rir),
      })).filter(x => x.kg > 0 || x.reps > 0);
      return exId && sets.length ? { exId, notes: '', sets } : null;
    }).filter(Boolean);
    return {
      id: ses.id || uid('w_'),
      routineId: ses.routineId || null,
      name: ses.routineName || 'Entreno',
      date: ses.date || todayISO(),
      startedAt: null,
      duration: null,
      notes: '',
      exercises,
    };
  }).filter(w => w.exercises.length).sort((a, b) => a.date.localeCompare(b.date));

  s.manualRMs = (old.manualRMs || []).map(m => ({ id: uid('m_'), exId: resolve(m.exName), kg: Number(m.kg) || 0, date: m.date || todayISO() })).filter(m => m.exId && m.kg > 0);
  s.bodyLog = (old.bodyLog || []).filter(b => b && b.date && b.weight).map(b => ({ date: b.date, weight: Number(b.weight) }));
  s.photos = (old.photos || []).filter(p => p && p.url).map(p => ({ id: uid('p_'), date: p.date || todayISO(), url: p.url }));
  s.settings.name = (old.profile && old.profile.name) || '';
  s.onboardingDone = !!old.onboardingDone || s.workouts.length > 0 || s.routines.length > 0;
  s.createdAt = old.startDate || s.createdAt;
  s.customExercises = custom;
  s.migratedFrom = 2;
  return s;
}

function normalize(s) {
  const f = freshState();
  return { ...f, ...s, settings: { ...f.settings, ...(s.settings || {}) } };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const m = migrateV2(JSON.parse(old));
      localStorage.setItem(KEY, JSON.stringify(m)); // fitlog_v2 se conserva intacto como copia
      return m;
    }
  } catch (e) { console.error('Error cargando datos', e); }
  return freshState();
}

function loadActive() {
  try { const r = localStorage.getItem(ACTIVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}

let state = loadState();
let active = loadActive();
const listeners = new Set();
let saveError = null;
export const onSaveError = { fn: null };

function persist(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    saveError = null;
  } catch (e) {
    saveError = e;
    onSaveError.fn && onSaveError.fn(e);
  }
}

function emit() { listeners.forEach(l => l()); }
export function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

export const getState = () => state;
export function setState(fn) {
  state = typeof fn === 'function' ? fn(state) : fn;
  persist(KEY, state);
  emit();
}
export function replaceState(next) { setState(normalize(next)); }

export const getActive = () => active;
export function setActive(fn) {
  active = typeof fn === 'function' ? fn(active) : fn;
  persist(ACTIVE_KEY, active);
  emit();
}

export function useStore() { return useSyncExternalStore(subscribe, getState); }
export function useActive() { return useSyncExternalStore(subscribe, getActive); }

// Ejercicios (biblioteca + personalizados)
export function getExercise(id, s = state) {
  return LIBRARY_BY_ID[id] || (s.customExercises || []).find(e => e.id === id) || { id, name: 'Ejercicio eliminado', muscle: 'Otro', equipment: 'Otro', missing: true };
}
