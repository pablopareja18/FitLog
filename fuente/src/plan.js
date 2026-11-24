// Generador de planes de entrenamiento
import { LIBRARY_BY_ID } from './exercises.js';
import { buildLifts } from './coach.js';
import { uid, todayISO, toISO, weekStart, parseISO, addDays } from './utils.js';

export const GOALS = [
  { value: 'hipertrofia', label: 'Hipertrofia', desc: 'Ganar músculo. Rangos de 6 a 15 repeticiones.' },
  { value: 'fuerza', label: 'Fuerza', desc: 'Mover más peso. Básicos pesados en 4 series de 5 repeticiones.' },
  { value: 'mixto', label: 'Fuerza + hipertrofia', desc: 'Un básico pesado por sesión y el resto para músculo.' },
];
export const LEVELS = [
  { value: 'principiante', label: 'Principiante', desc: 'Menos de 1 año entrenando de forma constante.' },
  { value: 'intermedio', label: 'Intermedio', desc: 'Entre 1 y 3 años.' },
  { value: 'avanzado', label: 'Avanzado', desc: 'Más de 3 años y buena técnica en los básicos.' },
];
export const EQUIP = [
  { value: 'gym', label: 'Gimnasio completo', desc: 'Barras, máquinas, poleas y mancuernas.' },
  { value: 'mancuernas', label: 'Mancuernas y banco', desc: 'Gimnasio en casa básico.' },
  { value: 'casa', label: 'Sin material', desc: 'Solo peso corporal y una barra de dominadas.' },
];
export const PRIORITIES = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Glúteos', 'Piernas', 'Abdomen'];
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_S = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Huecos por patrón de movimiento, con alternativas según material (la 1.ª es la principal, la 2.ª para variar)
const SLOTS = {
  squat:     { gym: ['sentadilla', 'sentadilla-frontal'], mancuernas: ['sentadilla-goblet'], casa: ['sentadilla-peso-corporal'] },
  squat2:    { gym: ['prensa', 'sentadilla-hack'], mancuernas: ['zancadas', 'zancadas-caminando'], casa: ['zancada-peso-corporal'] },
  hinge:     { gym: ['peso-muerto-rumano', 'peso-muerto-rumano-mancuernas'], mancuernas: ['peso-muerto-rumano-mancuernas'], casa: ['peso-muerto-una-pierna'] },
  deadlift:  { gym: ['peso-muerto'], mancuernas: ['peso-muerto-rumano-mancuernas'], casa: ['peso-muerto-una-pierna'] },
  lunge:     { gym: ['sentadilla-bulgara', 'zancadas'], mancuernas: ['sentadilla-bulgara', 'step-up'], casa: ['sentadilla-bulgara', 'zancada-peso-corporal'] },
  legcurl:   { gym: ['curl-femoral-tumbado', 'curl-femoral-sentado'], mancuernas: ['curl-nordico'], casa: ['curl-nordico'] },
  legext:    { gym: ['extension-cuadriceps'], mancuernas: ['step-up'], casa: ['sissy-squat'] },
  hipthrust: { gym: ['hip-thrust', 'hip-thrust-maquina'], mancuernas: ['hip-thrust'], casa: ['puente-gluteo-una-pierna'] },
  gluteiso:  { gym: ['abduccion-maquina', 'patada-gluteo-polea'], mancuernas: ['puente-gluteo'], casa: ['puente-gluteo'] },
  calf:      { gym: ['talones-pie', 'talones-sentado'], mancuernas: ['talones-peso-corporal'], casa: ['talones-peso-corporal'] },
  core:      { gym: ['crunch-polea', 'elevacion-piernas-colgado'], mancuernas: ['plancha', 'dead-bug'], casa: ['plancha', 'dead-bug'] },
  hpush:     { gym: ['press-banca', 'press-banca-mancuernas'], mancuernas: ['press-banca-mancuernas'], casa: ['flexiones', 'flexiones-declinadas'] },
  incline:   { gym: ['press-inclinado-mancuernas', 'press-inclinado-barra'], mancuernas: ['press-inclinado-mancuernas'], casa: ['flexiones-declinadas', 'flexiones'] },
  vpush:     { gym: ['press-militar', 'press-hombro-mancuernas'], mancuernas: ['press-hombro-mancuernas', 'press-arnold'], casa: ['flexiones-pica'] },
  chestiso:  { gym: ['cruces-polea', 'contractor-pecho'], mancuernas: ['aperturas-mancuernas'], casa: ['fondos-paralelas'] },
  hpull:     { gym: ['remo-barra', 'remo-polea-baja'], mancuernas: ['remo-mancuerna', 'remo-pecho-apoyado'], casa: ['remo-invertido'] },
  hpull2:    { gym: ['remo-polea-baja', 'remo-mancuerna'], mancuernas: ['remo-pecho-apoyado'], casa: ['superman', 'dominadas-negativas'] },
  vpull:     { gym: ['jalon-pecho', 'dominadas'], mancuernas: ['pullover-mancuerna'], casa: ['dominadas', 'dominadas-negativas'] },
  lateral:   { gym: ['elevaciones-laterales', 'elevaciones-laterales-polea'], mancuernas: ['elevaciones-laterales'], casa: ['ytw', 'flexiones-pica'] },
  reardelt:  { gym: ['face-pull', 'contractor-inverso'], mancuernas: ['pajaros'], casa: ['ytw'] },
  biceps:    { gym: ['curl-barra-z', 'curl-inclinado'], mancuernas: ['curl-mancuernas', 'curl-martillo'], casa: ['dominadas-supinas'] },
  biceps2:   { gym: ['curl-martillo', 'curl-polea'], mancuernas: ['curl-martillo', 'curl-concentrado'], casa: ['dominadas-negativas'] },
  triceps:   { gym: ['extension-triceps-cuerda', 'press-frances'], mancuernas: ['extension-overhead-mancuerna', 'patada-triceps'], casa: ['flexiones-diamante', 'fondos-banco'] },
  triceps2:  { gym: ['extension-overhead-polea', 'press-cerrado'], mancuernas: ['patada-triceps'], casa: ['fondos-banco'] },
};

// Plantillas de sesión: [hueco, papel, variante]
const SESSIONS = {
  TA: { name: 'Torso A', region: 'torso', slots: [['hpush', 'main'], ['hpull', 'sec'], ['vpush', 'sec'], ['vpull', 'sec'], ['lateral', 'acc'], ['biceps', 'acc'], ['triceps', 'acc']] },
  TB: { name: 'Torso B', region: 'torso', slots: [['incline', 'main'], ['vpull', 'sec', 1], ['hpull2', 'sec'], ['chestiso', 'acc'], ['reardelt', 'acc'], ['triceps', 'acc', 1], ['biceps', 'acc', 1]] },
  PA: { name: 'Pierna A', region: 'pierna', slots: [['squat', 'main'], ['hinge', 'sec'], ['lunge', 'sec'], ['legcurl', 'acc'], ['calf', 'acc'], ['core', 'acc']] },
  PB: { name: 'Pierna B', region: 'pierna', slots: [['deadlift', 'main'], ['squat2', 'sec'], ['hipthrust', 'sec'], ['legext', 'acc'], ['legcurl', 'acc', 1], ['calf', 'acc', 1]] },
  FA: { name: 'Full body A', region: 'full', slots: [['squat', 'main'], ['hpush', 'sec'], ['hpull', 'sec'], ['hinge', 'acc'], ['lateral', 'acc'], ['core', 'acc']] },
  FB: { name: 'Full body B', region: 'full', slots: [['deadlift', 'main'], ['vpush', 'sec'], ['vpull', 'sec'], ['lunge', 'acc'], ['biceps', 'acc'], ['triceps', 'acc']] },
  FC: { name: 'Full body C', region: 'full', slots: [['squat2', 'main'], ['incline', 'sec'], ['hpull2', 'sec'], ['legcurl', 'acc'], ['reardelt', 'acc'], ['core', 'acc', 1]] },
  PU: { name: 'Push', region: 'torso', slots: [['hpush', 'main'], ['incline', 'sec'], ['vpush', 'sec'], ['chestiso', 'acc'], ['lateral', 'acc'], ['triceps', 'acc']] },
  PL: { name: 'Pull', region: 'torso', slots: [['hpull', 'main'], ['vpull', 'sec'], ['hpull2', 'sec'], ['reardelt', 'acc'], ['biceps', 'acc'], ['biceps2', 'acc']] },
  LG: { name: 'Legs', region: 'pierna', slots: [['squat', 'main'], ['hinge', 'sec'], ['squat2', 'sec'], ['legcurl', 'acc'], ['legext', 'acc'], ['calf', 'acc']] },
  PU2: { name: 'Push B', region: 'torso', slots: [['vpush', 'main'], ['hpush', 'sec', 1], ['incline', 'sec', 1], ['lateral', 'acc', 1], ['chestiso', 'acc', 1], ['triceps2', 'acc']] },
  PL2: { name: 'Pull B', region: 'torso', slots: [['vpull', 'main', 1], ['hpull', 'sec', 1], ['hpull2', 'sec', 1], ['reardelt', 'acc', 1], ['biceps', 'acc', 1], ['biceps2', 'acc', 1]] },
  LG2: { name: 'Legs B', region: 'pierna', slots: [['deadlift', 'main'], ['squat2', 'sec', 1], ['hipthrust', 'sec'], ['lunge', 'acc'], ['legcurl', 'acc', 1], ['calf', 'acc', 1]] },
};

// Divisiones disponibles según días
export const SPLITS = {
  full: { label: 'Cuerpo completo', desc: 'Todo el cuerpo en cada sesión. Lo más eficiente con pocos días.',
    days: { 2: ['FA', 'FB'], 3: ['FA', 'FB', 'FC'], 4: ['FA', 'FB', 'FC', 'FA'], 5: ['FA', 'FB', 'FC', 'FA', 'FB'], 6: ['FA', 'FB', 'FC', 'FA', 'FB', 'FC'] } },
  upperlower: { label: 'Torso / Pierna', desc: 'Un día trabajas torso y otro día pierna.',
    days: { 2: ['TA', 'PA'], 3: ['TA', 'PA', 'TB'], 4: ['TA', 'PA', 'TB', 'PB'], 5: ['TA', 'PA', 'TB', 'PB', 'TA'], 6: ['TA', 'PA', 'TB', 'PB', 'TA', 'PA'] } },
  ppl: { label: 'Push / Pull / Legs', desc: 'Empuje (pecho, hombro, tríceps), tirón (espalda, bíceps) y pierna.',
    days: { 3: ['PU', 'PL', 'LG'], 6: ['PU', 'PL', 'LG', 'PU2', 'PL2', 'LG2'] } },
  pplul: { label: 'PPL + Torso/Pierna', desc: 'Push, Pull y Legs, y después un torso y una pierna.',
    days: { 5: ['PU', 'PL', 'LG', 'TA', 'PB'] } },
};

export function splitsFor(days) {
  return Object.entries(SPLITS).filter(([, s]) => s.days[days]).map(([value, s]) => ({ value, ...s }));
}

export const DEFAULT_DAYS = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };

// Series, repeticiones y descanso por objetivo y papel del ejercicio
const SCHEME = {
  fuerza:      { main: [4, 5, 5, 180], sec: [3, 5, 8, 150], acc: [3, 8, 12, 90] },
  hipertrofia: { main: [4, 6, 10, 150], sec: [3, 8, 12, 120], acc: [3, 10, 15, 75] },
  mixto:       { main: [4, 4, 6, 180], sec: [3, 8, 10, 120], acc: [3, 10, 15, 75] },
};

const PRIORITY_MUSCLES = {
  Pecho: ['Pecho'], Espalda: ['Espalda'], Hombros: ['Hombros'], Brazos: ['Bíceps', 'Tríceps'],
  Glúteos: ['Glúteos'], Piernas: ['Cuádriceps', 'Isquios'], Abdomen: ['Abdomen'],
};
const PRIORITY_EXTRA = { // ejercicio extra que se añade en las sesiones de esa región
  Pecho: ['chestiso', ['torso', 'full']], Espalda: ['hpull2', ['torso', 'full']], Hombros: ['lateral', ['torso', 'full']],
  Brazos: ['biceps2', ['torso', 'full']], Glúteos: ['gluteiso', ['pierna', 'full']], Piernas: ['legext', ['pierna', 'full']], Abdomen: ['core', ['pierna', 'torso', 'full']],
};

function pick(slot, equip, variant = 0) {
  const opts = (SLOTS[slot] && (SLOTS[slot][equip] || SLOTS[slot].gym)) || [];
  const id = opts[variant % Math.max(1, opts.length)] || opts[0];
  return id && LIBRARY_BY_ID[id] ? id : null;
}

export function generatePlan(o) {
  const { days, goal, split, weekdays, level, equip, priorities = [] } = o;
  const seq = o.order && o.order.length === days ? o.order : SPLITS[split].days[days];
  const scheme = SCHEME[goal];
  const { lifts, known } = buildLifts(o.marks || {}, level, o.bodyKg);
  const planId = uid('plan_');
  const routineByKey = {};
  const routines = [];

  [...new Set(seq)].forEach(key => {
    const tpl = SESSIONS[key];
    let slots = tpl.slots.map(([slot, role, v]) => ({ slot, role, v: v || 0 }));
    if (level === 'principiante') slots = slots.slice(0, 5);
    // prioridades: ejercicio extra de ese grupo
    priorities.forEach(p => {
      const [slot, regions] = PRIORITY_EXTRA[p] || [];
      if (slot && regions.includes(tpl.region)) slots.push({ slot, role: 'acc', v: 1, prio: p });
    });
    const used = new Set();
    const exercises = [];
    const countMuscle = p => exercises.filter(e => (PRIORITY_MUSCLES[p] || []).includes(LIBRARY_BY_ID[e.exId].muscle)).length;
    slots.forEach(({ slot, role, v, prio }) => {
      if (prio && countMuscle(prio) >= 2) return; // ya hay suficiente de ese grupo en esta sesión
      let exId = null;
      for (let k = 0; k < 3 && !exId; k++) { const c = pick(slot, equip, v + k); if (c && !used.has(c)) exId = c; }
      if (!exId) return;
      used.add(exId);
      let [sets, repMin, repMax, rest] = scheme[role];
      const fixed = goal === 'fuerza' && role === 'main'; // 4x5 fijo
      const muscle = LIBRARY_BY_ID[exId].muscle;
      if (!fixed) {
        if (level === 'principiante') sets = Math.max(2, sets - 1);
        if (level === 'avanzado' && role !== 'acc') sets += 1;
        if (priorities.some(p => (PRIORITY_MUSCLES[p] || []).includes(muscle))) sets = Math.min(6, sets + 1);
      }
      if (muscle === 'Abdomen' || LIBRARY_BY_ID[exId].equipment === 'Peso corporal') { repMin = Math.max(repMin, 8); repMax = Math.max(repMax, 15); }
      exercises.push({ exId, sets, rest, repMin, repMax, role });
    });
    const r = { id: uid('r_'), name: tpl.name, notes: `Plan · ${GOALS.find(g => g.value === goal).label}`, planId, exercises };
    routineByKey[key] = r.id;
    routines.push(r);
  });

  const sortedDays = [...weekdays].sort((a, b) => a - b);
  const schedule = sortedDays.map((wd, i) => ({ weekday: wd, routineId: routineByKey[seq[i]] }));
  const plan = {
    id: planId,
    name: `${SPLITS[split].label} · ${days} días`,
    goal, level, equip, split, days, priorities,
    lifts, known,
    schedule,
    deloadEvery: level === 'principiante' ? 6 : 5,
    startDate: toISO(weekStart(new Date())),
    createdAt: todayISO(),
  };
  return { plan, routines };
}

// 0 = lunes
export const weekdayOf = iso => (parseISO(iso).getDay() + 6) % 7;

export function planWeek(plan, iso = todayISO()) {
  const diff = Math.floor((weekStart(parseISO(iso)) - parseISO(plan.startDate)) / (7 * 86400000));
  return Math.max(1, diff + 1);
}
export function isPlanDeloadWeek(plan, iso) {
  const w = planWeek(plan, iso);
  return w % plan.deloadEvery === 0;
}

// Qué toca hoy y cuál es la próxima sesión
export function planToday(plan, workouts) {
  const today = todayISO();
  const wd = weekdayOf(today);
  const todayEntry = plan.schedule.find(s => s.weekday === wd);
  const doneToday = todayEntry && workouts.some(w => w.date === today && w.routineId === todayEntry.routineId);
  let next = null;
  for (let i = 1; i <= 7 && !next; i++) {
    const d = toISO(addDays(parseISO(today), i));
    const e = plan.schedule.find(s => s.weekday === weekdayOf(d));
    if (e) next = { ...e, date: d, inDays: i };
  }
  return { today: todayEntry || null, doneToday: !!doneToday, next };
}

// Incremento sugerido según material y peso
export function increment(exId, kg) {
  const ex = LIBRARY_BY_ID[exId];
  const eq = ex ? ex.equipment : 'Otro';
  if (eq === 'Mancuernas' || eq === 'Kettlebell') return kg < 10 ? 1 : 2;
  if (kg < 20) return 1;
  return 2.5;
}

export const SCHEME_OF = (goal, role) => SCHEME[goal][role];
