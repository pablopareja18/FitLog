import React, { useMemo, useState } from 'react';
import { useStore, setState, getState, getActive, setActive, getExercise } from '../store.js';
import { workoutVolume, workoutSets, weeksSinceDeload, sortedWorkouts } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Section, Empty, Sheet, toast, confirmDialog, actionSheet } from '../ui.jsx';
import { fmtNum, fmtDate, relDate, toUnit, todayISO, toISO, weekStart, addDays, uid, DAYS_S, fmtClock, fmtDuration, cap, DAYS, parseISO , fmtSet } from '../utils.js';
import { startWorkout, routineDiff, updateRoutineFromWorkout, routineFromWorkout } from '../workout.js';
import { ExercisePicker } from './ExercisePicker.jsx';
import { PlanCard } from './Plan.jsx';
import { copyForCoach } from '../coachProgram.js';
import { isPlanDeloadWeek, planWeek } from '../plan.js';

export async function guardStart(fn) {
  const a = getActive();
  if (a && !a.editing) {
    const v = await confirmDialog({ title: 'Tienes un entreno en curso', message: `“${a.name}” sigue abierto.`, options: [{ label: 'Reanudar entreno', value: 'resume', primary: true }, { label: 'Descartarlo y empezar otro', value: 'new', danger: true }, { label: 'Cancelar', value: null }] });
    if (v === 'resume') { setActive(x => ({ ...x, minimized: false })); return; }
    if (v !== 'new') return;
  } else if (a && a.editing) {
    const ok = await confirmDialog({ title: 'Estás editando un entreno', message: 'Se descartarán los cambios sin guardar.', confirm: 'Continuar', danger: true });
    if (!ok) return;
  }
  fn();
}

const TEMPLATES = [
  { name: 'Push Pull Legs', desc: '3 días · empuje, tirón y pierna', routines: [
    { name: 'Push', exercises: ['press-banca', 'press-inclinado-mancuernas', 'press-militar', 'elevaciones-laterales', 'extension-triceps-cuerda'] },
    { name: 'Pull', exercises: ['dominadas', 'remo-barra', 'jalon-pecho', 'face-pull', 'curl-mancuernas'] },
    { name: 'Legs', exercises: ['sentadilla', 'peso-muerto-rumano', 'prensa', 'curl-femoral-sentado', 'talones-pie'] },
  ] },
  { name: 'Torso / Pierna', desc: '4 días · dos torsos y dos piernas', routines: [
    { name: 'Torso A', exercises: ['press-banca', 'remo-barra', 'press-militar', 'jalon-pecho', 'curl-barra', 'extension-triceps-polea'] },
    { name: 'Pierna A', exercises: ['sentadilla', 'peso-muerto-rumano', 'sentadilla-bulgara', 'hip-thrust', 'talones-pie'] },
    { name: 'Torso B', exercises: ['press-inclinado-barra', 'remo-mancuerna', 'press-hombro-mancuernas', 'dominadas', 'elevaciones-laterales', 'curl-martillo'] },
    { name: 'Pierna B', exercises: ['peso-muerto', 'prensa', 'extension-cuadriceps', 'curl-femoral-tumbado', 'abduccion-maquina'] },
  ] },
  { name: 'Full body', desc: '3 días · cuerpo completo A/B', routines: [
    { name: 'Full body A', exercises: ['sentadilla', 'press-banca', 'remo-barra', 'elevaciones-laterales', 'plancha'] },
    { name: 'Full body B', exercises: ['peso-muerto', 'press-militar', 'jalon-pecho', 'zancadas', 'curl-mancuernas'] },
  ] },
  { name: 'Fuerza 5×5', desc: '3 días · básicos alternos A/B', routines: [
    { name: '5×5 A', sets: 5, exercises: ['sentadilla', 'press-banca', 'remo-barra'] },
    { name: '5×5 B', sets: 5, exercises: ['sentadilla', 'press-militar', 'peso-muerto'] },
  ] },
];

export function TrainTab({ nav }) {
  const s = useStore();
  const unit = s.settings.unit;
  const [tplOpen, setTplOpen] = useState(false);
  const ws = weekStart(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => toISO(addDays(ws, i)));
  const thisWeek = s.workouts.filter(w => w.date >= weekDays[0] && w.date <= weekDays[6]);
  const trainedDays = new Set(thisWeek.map(w => w.date));
  const vol = thisWeek.reduce((a, w) => a + workoutVolume(w), 0);
  const dl = weeksSinceDeload(s.workouts, s.deloads);
  const snoozed = s.deloadSnoozeUntil && s.deloadSnoozeUntil >= todayISO();
  const lastByRoutine = useMemo(() => {
    const m = {};
    sortedWorkouts(s.workouts).forEach(w => { if (w.routineId) m[w.routineId] = w.date; });
    return m;
  }, [s.workouts]);
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Buenas noches' : hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';

  const routineMenu = async r => {
    const v = await actionSheet({ title: r.name, items: [
      { label: 'Editar rutina', icon: 'edit', value: 'edit' },
      { label: 'Duplicar', icon: 'copy', value: 'dup' },
      { label: 'Eliminar', icon: 'trash', value: 'del', danger: true },
    ] });
    if (v === 'edit') nav.push('routine', { id: r.id });
    if (v === 'dup') { setState(x => ({ ...x, routines: [...x.routines, { ...r, id: uid('r_'), name: `${r.name} (copia)` }] })); toast('Rutina duplicada'); }
    if (v === 'del' && await confirmDialog({ title: `¿Eliminar “${r.name}”?`, message: 'Tu historial de entrenos no se borra.', confirm: 'Eliminar', danger: true })) {
      setState(x => ({ ...x, routines: x.routines.filter(y => y.id !== r.id) }));
    }
  };

  const addTemplate = t => {
    const rs = t.routines.map(r => ({ id: uid('r_'), name: r.name, notes: t.name, exercises: r.exercises.map(exId => ({ exId, sets: r.sets || 3, rest: s.settings.defaultRest })) }));
    setState(x => ({ ...x, routines: [...x.routines, ...rs] }));
    setTplOpen(false);
    toast(`${rs.length} rutinas añadidas`);
  };

  return (
    <div className="page">
      <div className="page-body">
        <div className="hello">
          <div className="hello-sub">{cap(DAYS[new Date().getDay()])}, {fmtDate(todayISO())}</div>
          <h1 className="hello-h">{hello}{s.settings.name ? `, ${s.settings.name}` : ''}</h1>
        </div>

        <div className="card week-card">
          <div className="row-between">
            <div className="card-k">Esta semana</div>
            <button className="text-btn sm" onClick={() => nav.tab('progress')}>Ver progreso <Icon name="chevronR" size={14} /></button>
          </div>
          <div className="week-stats">
            <div><div className="ws-v">{thisWeek.length}</div><div className="ws-k">{thisWeek.length === 1 ? 'entreno' : 'entrenos'}</div></div>
            <div><div className="ws-v">{fmtNum(toUnit(vol, unit))}</div><div className="ws-k">{unit} de volumen</div></div>
            <div><div className="ws-v">{thisWeek.reduce((a, w) => a + workoutSets(w), 0)}</div><div className="ws-k">series</div></div>
          </div>
          <div className="week-days">
            {weekDays.map((d, i) => (
              <div key={d} className={`wd ${trainedDays.has(d) ? 'on' : ''} ${d === todayISO() ? 'today' : ''}`}>
                <span className="wd-l">{DAYS_S[i]}</span>
                <span className="wd-dot">{trainedDays.has(d) ? <Icon name="check" size={14} stroke={3} /> : parseISO(d).getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        <PlanCard nav={nav} onCreate={() => nav.push('planWizard')} />

        {dl.inDeload ? (
          <div className="banner amber">
            <Icon name="battery" size={22} />
            <div className="grow">
              <div className="banner-t">Semana de descarga activa</div>
              <div className="banner-s">Al empezar un entreno, los pesos se proponen al 60% de la última vez.</div>
            </div>
            <button className="text-btn sm" onClick={() => setState(x => ({ ...x, deloads: x.deloads.filter(d => d !== toISO(ws)) }))}>Quitar</button>
          </div>
        ) : (s.plan ? isPlanDeloadWeek(s.plan) : dl.weeks >= 4) && !snoozed ? (
          <div className="banner amber">
            <Icon name="battery" size={22} />
            <div className="grow">
              <div className="banner-t">Toca semana de descarga</div>
              <div className="banner-s">{s.plan ? `Semana ${planWeek(s.plan)} de tu plan: toca descargar para recuperarte y seguir progresando.` : `Llevas ${dl.weeks} semanas seguidas entrenando. Se recomienda descargar cada 4–6 semanas.`}</div>
              <div className="banner-actions">
                <button className="btn btn-sm btn-amber" onClick={() => { setState(x => ({ ...x, deloads: [...new Set([...x.deloads, toISO(ws)])] })); toast('Semana de descarga activada'); }}>Hacer descarga</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setState(x => ({ ...x, deloadSnoozeUntil: toISO(addDays(ws, 6)) }))}>Ahora no</button>
              </div>
            </div>
          </div>
        ) : null}

        <button className="btn btn-primary btn-block btn-lg mt16" onClick={() => guardStart(() => startWorkout({}))}>
          <Icon name="plus" size={20} stroke={2.5} /> Empezar entreno vacío
        </button>

        <Section title="Mis rutinas" action={<button className="text-btn" onClick={() => nav.push('routine', { id: null })}><Icon name="plus" size={16} /> Nueva</button>}>
          {s.routines.length === 0 ? (
            <Empty icon="list" title="Crea tu primera rutina" text="Agrupa los ejercicios que haces cada día y empieza a entrenar con un toque."
              action={<div className="stack mt12"><button className="btn btn-primary" onClick={() => nav.push('routine', { id: null })}>Crear rutina</button><button className="btn btn-secondary" onClick={() => setTplOpen(true)}>Ver plantillas</button></div>} />
          ) : (
            <div className="stack">
              {s.routines.map(r => {
                const names = r.exercises.map(e => getExercise(e.exId, s).name);
                const last = lastByRoutine[r.id];
                return (
                  <div key={r.id} className="card routine-card">
                    <div className="row-between">
                      <button className="grow minw0 text-left" onClick={() => nav.push('routine', { id: r.id })}>
                        <div className="routine-name ellipsis">{r.name}{r.planId && s.plan && r.planId === s.plan.id && <span className="tag">Plan</span>}</div>
                        <div className="row-sub">{r.exercises.length} ejercicios{last ? ` · ${relDate(last).toLowerCase()}` : ' · sin estrenar'}</div>
                      </button>
                      <button className="icon-btn" onClick={() => routineMenu(r)} aria-label="Opciones de rutina"><Icon name="more" size={22} /></button>
                    </div>
                    <div className="routine-ex">{names.slice(0, 4).join(' · ')}{names.length > 4 ? ` y ${names.length - 4} más` : ''}</div>
                    <button className="btn btn-primary btn-block mt12" onClick={() => guardStart(() => startWorkout({ routineId: r.id }))}>
                      <Icon name="play" size={16} /> Empezar
                    </button>
                  </div>
                );
              })}
              <button className="btn btn-ghost btn-block" onClick={() => setTplOpen(true)}><Icon name="layers" size={18} /> Añadir desde plantillas</button>
            </div>
          )}
        </Section>
        <div style={{ height: 24 }} />
      </div>

      <Sheet open={tplOpen} onClose={() => setTplOpen(false)} title="Plantillas">
        <div className="stack">
          {TEMPLATES.map(t => (
            <button key={t.name} className="card card-btn" onClick={() => addTemplate(t)}>
              <div className="row-between"><div className="row-title">{t.name}</div><Icon name="plus" size={18} /></div>
              <div className="row-sub">{t.desc}</div>
              <div className="routine-ex">{t.routines.map(r => r.name).join(' · ')}</div>
            </button>
          ))}
          <div className="muted small">Se añaden como rutinas normales: puedes editarlas después.</div>
        </div>
      </Sheet>
    </div>
  );
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const restLabel = sec => sec ? fmtClock(sec) : 'Sin descanso';

export function RoutineEditor({ id, onBack }) {
  const s = useStore();
  const orig = id ? s.routines.find(r => r.id === id) : null;
  const [r, setR] = useState(() => orig ? JSON.parse(JSON.stringify(orig)) : { id: uid('r_'), name: '', notes: '', exercises: [] });
  const [picker, setPicker] = useState(null);
  const dirty = JSON.stringify(r) !== JSON.stringify(orig || { id: r.id, name: '', notes: '', exercises: [] });

  const back = async () => {
    if (dirty && !(await confirmDialog({ title: '¿Salir sin guardar?', message: 'Perderás los cambios de la rutina.', confirm: 'Salir', danger: true }))) return;
    onBack();
  };
  const save = () => {
    if (!r.name.trim()) return toast('Ponle un nombre a la rutina', 'error');
    if (!r.exercises.length) return toast('Añade al menos un ejercicio', 'error');
    const clean = { ...r, name: r.name.trim() };
    setState(x => ({ ...x, routines: orig ? x.routines.map(y => y.id === r.id ? clean : y) : [...x.routines, clean] }));
    toast(orig ? 'Rutina guardada' : 'Rutina creada');
    onBack();
  };
  const upEx = (i, patch) => setR(x => ({ ...x, exercises: x.exercises.map((e, j) => j === i ? { ...e, ...patch } : e) }));
  const move = (i, d) => setR(x => { const a = [...x.exercises]; [a[i], a[i + d]] = [a[i + d], a[i]]; return { ...x, exercises: a }; });

  const exMenu = async i => {
    const e = r.exercises[i];
    const v = await actionSheet({ title: getExercise(e.exId, s).name, items: [
      { label: 'Descanso', icon: 'timer', value: 'rest', hint: restLabel(e.rest) },
      { label: 'Objetivo de repeticiones', icon: 'target', value: 'range', hint: e.repMin ? `${e.repMin}-${e.repMax}` : 'Sin objetivo' },
      { label: 'Reemplazar', icon: 'swap', value: 'rep' },
      i > 0 && { label: 'Mover arriba', icon: 'arrowUp', value: 'up' },
      i < r.exercises.length - 1 && { label: 'Mover abajo', icon: 'arrowDown', value: 'down' },
      { label: 'Quitar de la rutina', icon: 'trash', value: 'del', danger: true },
    ] });
    if (v === 'rest') {
      const t = await actionSheet({ title: 'Descanso entre series', items: REST_OPTIONS.map(o => ({ label: restLabel(o), value: String(o), active: o === e.rest })) });
      if (t !== null) upEx(i, { rest: Number(t) });
    }
    if (v === 'range') {
      const opts = [null, [3, 5], [4, 6], [5, 8], [6, 10], [8, 12], [10, 15], [12, 20]];
      const t = await actionSheet({ title: 'Objetivo de repeticiones', items: opts.map(o => ({ label: o ? `${o[0]}-${o[1]} reps` : 'Sin objetivo', value: o ? o.join('-') : 'none', active: o ? e.repMin === o[0] && e.repMax === o[1] : !e.repMin })) });
      if (t === 'none') upEx(i, { repMin: undefined, repMax: undefined });
      else if (t) { const [a, b] = t.split('-').map(Number); upEx(i, { repMin: a, repMax: b }); }
    }
    if (v === 'rep') setPicker({ mode: 'replace', i });
    if (v === 'up') move(i, -1);
    if (v === 'down') move(i, 1);
    if (v === 'del') setR(x => ({ ...x, exercises: x.exercises.filter((_, j) => j !== i) }));
  };

  return (
    <div className="page">
      <TopBar title={orig ? 'Editar rutina' : 'Nueva rutina'} onBack={back} right={<button className="text-btn strong" onClick={save}>Guardar</button>} />
      <div className="page-body">
        <input className="title-input" value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder="Nombre de la rutina" autoFocus={!orig} />
        <input className="input subtle mt8" value={r.notes || ''} onChange={e => setR({ ...r, notes: e.target.value })} placeholder="Nota (opcional): días, objetivo…" />

        <Section title={`Ejercicios${r.exercises.length ? ` · ${r.exercises.length}` : ''}`}>
          {r.exercises.length === 0 ? (
            <div className="empty-inline">Todavía no hay ejercicios en esta rutina.</div>
          ) : (
            <div className="stack">
              {r.exercises.map((e, i) => {
                const ex = getExercise(e.exId, s);
                return (
                  <div key={`${e.exId}-${i}`} className="card re-row">
                    <div className="re-order">
                      <button className="icon-btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir"><Icon name="chevronU" size={16} /></button>
                      <button className="icon-btn sm" disabled={i === r.exercises.length - 1} onClick={() => move(i, 1)} aria-label="Bajar"><Icon name="chevronD" size={16} /></button>
                    </div>
                    <div className="grow minw0">
                      <div className="row-title ellipsis">{ex.name}</div>
                      <div className="row-sub">{ex.muscle} · descanso {restLabel(e.rest)}</div>
                      {e.repMin && <div className="target-chip mt8"><Icon name="target" size={13} /> {e.repMin}-{e.repMax} reps</div>}
                      <div className="stepper mt8">
                        <button onClick={() => upEx(i, { sets: Math.max(1, e.sets - 1) })} aria-label="Menos series">−</button>
                        <span>{e.sets} {e.sets === 1 ? 'serie' : 'series'}</span>
                        <button onClick={() => upEx(i, { sets: Math.min(12, e.sets + 1) })} aria-label="Más series">+</button>
                      </div>
                    </div>
                    <button className="icon-btn" onClick={() => exMenu(i)} aria-label="Opciones"><Icon name="more" size={22} /></button>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn btn-secondary btn-block mt12" onClick={() => setPicker({ mode: 'add' })}><Icon name="plus" size={18} /> Añadir ejercicios</button>
        </Section>
        {orig && (
          <button className="btn btn-ghost-danger btn-block mt24" onClick={async () => {
            if (await confirmDialog({ title: `¿Eliminar “${orig.name}”?`, message: 'Tu historial de entrenos no se borra.', confirm: 'Eliminar', danger: true })) {
              setState(x => ({ ...x, routines: x.routines.filter(y => y.id !== orig.id) })); onBack();
            }
          }}>Eliminar rutina</button>
        )}
        <div style={{ height: 40 }} />
      </div>
      {picker && <ExercisePicker single={picker.mode === 'replace'} onClose={() => setPicker(null)} onDone={ids => {
        if (picker.mode === 'replace') upEx(picker.i, { exId: ids[0] });
        else setR(x => ({ ...x, exercises: [...x.exercises, ...ids.map(exId => ({ exId, sets: 3, rest: s.settings.defaultRest }))] }));
        setPicker(null);
      }} />}
    </div>
  );
}

// ---------- Resumen al terminar
export const EQUIVALENCIAS = [
  [8, 'jamón ibérico de pata negra', 'jamones ibéricos de pata negra'],
  [10, 'bolsa de la compra bien cargada', 'bolsas de la compra bien cargadas'],
  [15, 'microondas', 'microondas'],
  [20, 'maleta llena hasta los topes', 'maletas llenas hasta los topes'],
  [25, 'bulldog inglés', 'bulldogs ingleses'],
  [35, 'televisor de 55 pulgadas', 'televisores de 55 pulgadas'],
  [40, 'pastor alemán', 'pastores alemanes'],
  [70, 'lavadora', 'lavadoras'],
  [130, 'nevera americana', 'neveras americanas'],
  [150, 'máquina recreativa arcade', 'máquinas recreativas arcade'],
  [190, 'león africano', 'leones africanos'],
  [250, 'cabina telefónica', 'cabinas telefónicas'],
  [300, 'oso pardo', 'osos pardos'],
  [480, 'piano de cola', 'pianos de cola'],
  [600, 'vaca frisona', 'vacas frisonas'],
  [700, 'caballo de carreras', 'caballos de carreras'],
  [1100, 'Seat Ibiza', 'Seat Ibiza'],
  [1500, 'tortilla de patatas récord mundial', 'tortillas de patatas récord mundial'],
  [2000, 'rinoceronte blanco', 'rinocerontes blancos'],
  [3500, 'furgoneta de reparto', 'furgonetas de reparto'],
  [4000, 'toro de Osborne', 'toros de Osborne'],
  [6000, 'elefante africano', 'elefantes africanos'],
  [8000, 'Tiranosaurio Rex', 'Tiranosaurios Rex'],
  [12000, 'autobús urbano', 'autobuses urbanos'],
  [21000, 'paella gigante récord mundial', 'paellas gigantes récord mundial'],
  [60000, 'tanque Leopard', 'tanques Leopard'],
  [80000, 'Boeing 737', 'Boeing 737'],
  [150000, 'ballena azul', 'ballenas azules'],
  [204000, 'Estatua de la Libertad', 'Estatuas de la Libertad'],
  [7300000, 'Torre Eiffel', 'Torres Eiffel'],
];

export function equivalencia(kg) {
  if (!(kg > 0)) return null;
  let best = EQUIVALENCIAS[0];
  for (let i = EQUIVALENCIAS.length - 1; i >= 0; i--) if (EQUIVALENCIAS[i][0] <= kg) { best = EQUIVALENCIAS[i]; break; }
  const n = kg / best[0];
  const r = n < 1.15 ? 1 : Math.round(n * 2) / 2;
  const count = r === 1 ? (n < 1 ? 'casi un' : 'un') : fmtNum(r, 1);
  const art = r === 1 ? (/^(bolsa|maleta|lavadora|nevera|máquina|cabina|vaca|tortilla|furgoneta|paella|ballena|Estatua|Torre)/.test(best[1]) ? (n < 1 ? 'casi una' : 'una') : count) : count;
  return `${art} ${r === 1 ? best[1] : best[2]}`;
}

const MENSAJES = ['Brutal. Eso es constancia de verdad.', 'Tu yo del futuro te lo agradecerá.', 'Un entreno más en la cuenta.', 'Así se construye: sesión a sesión.', 'Hoy has ganado a la pereza.', 'Nada de excusas: resultados.'];

export function WorkoutSummary({ result, onClose, onOpenWorkout }) {
  const s = useStore();
  const unit = s.settings.unit;
  const w = s.workouts.find(x => x.id === result.workout.id) || result.workout;
  const vol = workoutVolume(w);
  const diff = routineDiff(w, s);
  const [msg] = useState(() => MENSAJES[Math.floor(Math.random() * MENSAJES.length)]);
  const count = s.workouts.length;
  const [saved, setSaved] = useState(false);

  return (
    <div className="overlay-page summary">
      <div className="page-body">
        <div className="sum-hero">
          <div className="sum-badge"><Icon name="check" size={34} stroke={3} /></div>
          <div className="sum-k">Entreno nº {count}</div>
          <h1 className="sum-h">¡Enhorabuena!</h1>
          <div className="sum-msg">{msg}</div>
        </div>
        <div className="card sum-card">
          <div className="row-title">{w.name}</div>
          <div className="row-sub">{fmtDate(w.date, { weekday: true })}</div>
          <div className="sum-stats">
            <div><div className="ws-v">{fmtDuration(w.duration)}</div><div className="ws-k">duración</div></div>
            <div><div className="ws-v">{fmtNum(toUnit(vol, unit))}</div><div className="ws-k">{unit} volumen</div></div>
            <div><div className="ws-v">{workoutSets(w)}</div><div className="ws-k">series</div></div>
          </div>
        </div>
        {vol > 0 && (
          <div className="card sum-eq">
            <div className="card-k">Has levantado el equivalente a</div>
            <div className="sum-eq-t">{equivalencia(vol)}</div>
          </div>
        )}
        {result.prs.length > 0 && (
          <div className="card mt12">
            <div className="card-k"><Icon name="trophy" size={15} /> {result.prs.length === 1 ? 'Nuevo récord' : `${result.prs.length} récords nuevos`}</div>
            {result.prs.map((p, i) => (
              <div key={i} className="row-between row-line">
                <span>{getExercise(p.exId, s).name}</span>
                <span className="pill accent">{p.kind === '1rm' ? '1RM' : 'Peso máx.'} {fmtNum(toUnit(p.kg, unit), 1)} {unit}</span>
              </div>
            ))}
          </div>
        )}
        <div className="card mt12">
          {w.exercises.map(e => {
            const best = e.sets.filter(x => x.type !== 'W').sort((a, b) => b.kg - a.kg)[0];
            return (
              <div key={e.exId} className="row-between row-line">
                <span className="ellipsis"><span className="muted">{e.sets.length} ×</span> {getExercise(e.exId, s).name}</span>
                {best && <span className="tnum muted">{fmtSet(best.kg, best.reps, unit)}</span>}
              </div>
            );
          })}
        </div>
        {diff && diff.planId !== 'coach' && !saved && (
          <div className="card mt12">
            <div className="row-title">¿Actualizar la rutina?</div>
            <div className="row-sub">Has cambiado ejercicios o series respecto a “{diff.name}”.</div>
            <button className="btn btn-secondary btn-block mt12" onClick={() => { updateRoutineFromWorkout(w); setSaved(true); toast('Rutina actualizada'); }}>Actualizar “{diff.name}”</button>
          </div>
        )}
        {!w.routineId && !saved && (
          <button className="btn btn-secondary btn-block mt12" onClick={() => { routineFromWorkout(w); setSaved(true); toast('Guardado como rutina'); }}><Icon name="list" size={18} /> Guardar como rutina</button>
        )}
        <button className="btn btn-secondary btn-block mt16" onClick={async () => { const r = await copyForCoach(w); toast(r === 'copied' ? 'Copiado. Pégalo en el chat del entrenador' : r ? 'Listo' : 'No se pudo copiar'); }}><Icon name="copy" size={18} /> Copiar para el entrenador</button>
        <button className="btn btn-primary btn-block btn-lg mt12" onClick={onClose}>Hecho</button>
        <button className="btn btn-ghost btn-block mt8" onClick={() => onOpenWorkout(w.id)}>Ver detalle</button>
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
