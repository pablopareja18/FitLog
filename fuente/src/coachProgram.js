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
