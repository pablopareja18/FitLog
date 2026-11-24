// Entrenador: estima cargas a partir de las marcas del usuario y, cuando hay historial, progresa con él
import { LIBRARY_BY_ID } from './exercises.js';
import { roundTo } from './utils.js';

export const BASE_LIFTS = [
  { key: 'squat', exId: 'sentadilla', label: 'Sentadilla' },
  { key: 'bench', exId: 'press-banca', label: 'Press banca' },
  { key: 'deadlift', exId: 'peso-muerto', label: 'Peso muerto' },
  { key: 'press', exId: 'press-militar', label: 'Press militar' },
  { key: 'row', exId: 'remo-barra', label: 'Remo con barra' },
];

// 1RM típico (kg) por nivel cuando no se conocen las marcas
const LEVEL_1RM = {
  principiante: { squat: 55, bench: 45, deadlift: 65, press: 30, row: 42 },
  intermedio: { squat: 95, bench: 72, deadlift: 115, press: 47, row: 68 },
  avanzado: { squat: 135, bench: 100, deadlift: 165, press: 65, row: 88 },
};

// 1RM equivalente del ejercicio como fracción de un básico. Mancuernas = peso por mano.
const REF = {
  sentadilla: ['squat', 1], 'sentadilla-frontal': ['squat', 0.8], prensa: ['squat', 1.6], 'sentadilla-hack': ['squat', 0.9],
  'sentadilla-goblet': ['squat', 0.3], zancadas: ['squat', 0.3], 'zancadas-caminando': ['squat', 0.28], 'sentadilla-bulgara': ['squat', 0.25], 'step-up': ['squat', 0.25],
  'extension-cuadriceps': ['squat', 0.55], 'curl-femoral-tumbado': ['squat', 0.4], 'curl-femoral-sentado': ['squat', 0.45], 'abduccion-maquina': ['squat', 0.55],
  'talones-pie': ['squat', 0.9], 'talones-sentado': ['squat', 0.6], 'patada-gluteo-polea': ['squat', 0.2], 'crunch-polea': ['squat', 0.4],
  'hip-thrust': ['squat', 1.1], 'hip-thrust-maquina': ['squat', 1.1],
  'peso-muerto': ['deadlift', 1], 'peso-muerto-rumano': ['deadlift', 0.75], 'peso-muerto-rumano-mancuernas': ['deadlift', 0.3],
  'press-banca': ['bench', 1], 'press-banca-mancuernas': ['bench', 0.37], 'press-inclinado-mancuernas': ['bench', 0.33], 'press-inclinado-barra': ['bench', 0.8],
  'cruces-polea': ['bench', 0.2], 'contractor-pecho': ['bench', 0.55], 'aperturas-mancuernas': ['bench', 0.17],
  'press-militar': ['press', 1], 'press-hombro-mancuernas': ['press', 0.4], 'press-arnold': ['press', 0.35],
  'elevaciones-laterales': ['press', 0.2], 'elevaciones-laterales-polea': ['press', 0.17], 'face-pull': ['press', 0.45], 'contractor-inverso': ['press', 0.45], pajaros: ['press', 0.17],
  'remo-barra': ['row', 1], 'remo-polea-baja': ['row', 0.9], 'remo-mancuerna': ['row', 0.45], 'remo-pecho-apoyado': ['row', 0.36], 'jalon-pecho': ['row', 0.95], 'pullover-mancuerna': ['row', 0.3],
  'curl-barra-z': ['bench', 0.4], 'curl-inclinado': ['bench', 0.15], 'curl-martillo': ['bench', 0.2], 'curl-mancuernas': ['bench', 0.18], 'curl-polea': ['bench', 0.3], 'curl-concentrado': ['bench', 0.14],
  'extension-triceps-cuerda': ['bench', 0.3], 'press-frances': ['bench', 0.3], 'extension-overhead-polea': ['bench', 0.3], 'extension-overhead-mancuerna': ['bench', 0.25],
  'press-cerrado': ['bench', 0.8], 'patada-triceps': ['bench', 0.1],
};
const MUSCLE_LIFT = { Pecho: 'bench', Espalda: 'row', Hombros: 'press', Bíceps: 'bench', Tríceps: 'bench', Cuádriceps: 'squat', Isquios: 'deadlift', Glúteos: 'squat', Gemelos: 'squat', Abdomen: 'squat', Trapecio: 'deadlift', Lumbar: 'deadlift', Aductores: 'squat' };
const EQUIP_FRAC = { Barra: 0.75, 'Barra Z': 0.4, Multipower: 0.75, Máquina: 0.6, Polea: 0.45, Mancuernas: 0.3, Kettlebell: 0.25 };
const MUSCLE_FRAC = { Bíceps: 0.45, Tríceps: 0.6, Abdomen: 0.6, Gemelos: 1 };

export const isBodyweight = exId => {
  const ex = LIBRARY_BY_ID[exId];
  return !!ex && ex.equipment === 'Peso corporal';
};

export function defaultLifts(level, bodyKg) {
  const base = LEVEL_1RM[level] || LEVEL_1RM.intermedio;
  const k = bodyKg ? Math.min(1.4, Math.max(0.7, bodyKg / 78)) : 1;
  const out = {};
  Object.keys(base).forEach(key => { out[key] = roundTo(base[key] * k, 2.5); });
  return out;
}

// Marcas del usuario (1RM estimado) completadas con la estimación por nivel
export function resolveLifts(marks = {}, level, bodyKg) {
  const d = defaultLifts(level, bodyKg);
  const out = {};
  Object.keys(d).forEach(key => { out[key] = marks[key] > 0 ? marks[key] : d[key]; });
  return out;
}

export function est1RM(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

// Si hay marcas reales en algún básico, el resto se ajusta por la relación típica entre levantamientos
export function buildLifts(marks = {}, level, bodyKg) {
  const d = defaultLifts(level, bodyKg);
  const known = Object.keys(d).filter(k => marks[k] > 0);
  const scale = known.length ? known.reduce((a, k) => a + marks[k] / d[k], 0) / known.length : 1;
  const out = {};
  Object.keys(d).forEach(k => { out[k] = marks[k] > 0 ? marks[k] : roundTo(d[k] * Math.min(1.5, Math.max(0.6, scale)), 2.5); });
  return { lifts: out, known };
}

// Carga que se puede montar de verdad según el material
export function roundLoad(exId, kg) {
  const eq = (LIBRARY_BY_ID[exId] || {}).equipment;
  if (eq === 'Mancuernas' || eq === 'Kettlebell') return kg < 10 ? Math.max(2, roundTo(kg, 1)) : roundTo(kg, 2);
  if (eq === 'Barra') return Math.max(20, roundTo(kg, 2.5));
  if (eq === 'Barra Z') return Math.max(10, roundTo(kg, 2.5));
  return Math.max(kg < 10 ? 2.5 : 5, roundTo(kg, 2.5));
}

// Peso de arranque de un ejercicio para unas repeticiones objetivo (con 2 en recámara; 3 si es principiante)
export function startingLoad(exId, lifts, reps, level) {
  if (isBodyweight(exId) || !lifts) return null;
  const ex = LIBRARY_BY_ID[exId] || {};
  let ref = REF[exId];
  if (!ref) {
    const key = MUSCLE_LIFT[ex.muscle];
    if (!key) return null;
    ref = [key, (EQUIP_FRAC[ex.equipment] ?? 0.4) * (MUSCLE_FRAC[ex.muscle] ?? 1)];
  }
  const oneRm = lifts[ref[0]] * ref[1];
  if (!(oneRm > 0)) return null;
  const rir = level === 'principiante' ? 3 : 2;
  return { kg: roundLoad(exId, oneRm / (1 + (reps + rir) / 30)), lift: ref[0], ratio: ref[1] };
}
