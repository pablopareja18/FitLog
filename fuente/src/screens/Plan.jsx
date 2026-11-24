import { coachTargetText } from '../coachProgram.js';
import React, { useMemo, useState } from 'react';
import { useStore, setState, getExercise } from '../store.js';
import { Icon } from '../icons.jsx';
import { TopBar, Section, toast, confirmDialog, actionSheet } from '../ui.jsx';
import { GOALS, LEVELS, EQUIP, PRIORITIES, WEEKDAYS, WEEKDAYS_S, SPLITS, splitsFor, DEFAULT_DAYS, generatePlan, SCHEME_OF, planWeek, planToday, isPlanDeloadWeek, weekdayOf } from '../plan.js';
import { toISO, weekStart, addDays, todayISO, fmtClock, fmtDate, cap, relDate, fromUnit, toUnit, parseNum, fmtNum, uid } from '../utils.js';
import { BASE_LIFTS, buildLifts, est1RM, startingLoad } from '../coach.js';
import { ExercisePicker } from './ExercisePicker.jsx';
import { startWorkout } from '../workout.js';
import { guardStart } from './Train.jsx';

const DAY_NAMES_LOWER = ['el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado', 'el domingo'];

function Opt({ on, onClick, title, desc, multi }) {
  return (
    <button className={`opt ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      <div className="grow">
        <div className="opt-t">{title}</div>
        {desc && <div className="opt-d">{desc}</div>}
      </div>
      <div className={`check ${on ? 'on' : ''}`} style={multi ? { borderRadius: 7 } : undefined}>{on && <Icon name="check" size={16} stroke={3} />}</div>
    </button>
  );
}

export function PlanWizard({ onClose, onCreated }) {
  const s = useStore();
  const [step, setStep] = useState(0);
  const unit = s.settings.unit;
  const [o, setO] = useState({ days: 3, goal: 'hipertrofia', split: 'upperlower', weekdays: DEFAULT_DAYS[3], level: 'intermedio', equip: 'gym', priorities: [] });
  const [inputs, setInputs] = useState({}); // marcas: { squat: { kg, reps } } en la unidad del usuario
  const [draft, setDraft] = useState(null); // { sig, plan, routines } editable
  const [picker, setPicker] = useState(null);
  const set = patch => setO(x => ({ ...x, ...patch }));
  const splits = splitsFor(o.days);
  const bodyKg = useMemo(() => { const b = [...s.bodyLog].sort((a, c) => a.date.localeCompare(c.date)); return b.length ? b[b.length - 1].weight : null; }, [s.bodyLog]);
  const marks = useMemo(() => {
    const m = {};
    BASE_LIFTS.forEach(l => { const i = inputs[l.key]; if (i) { const e = est1RM(fromUnit(parseNum(i.kg) || 0, unit), Math.round(parseNum(i.reps) || 1)); if (e > 0) m[l.key] = Math.round(e * 2) / 2; } });
    return m;
  }, [inputs, unit]);
  const lifts = useMemo(() => buildLifts(marks, o.level, bodyKg), [marks, o.level, bodyKg]);
  const baseSeq = SPLITS[o.split]?.days[o.days] || [];
  const seq = o.order && o.order.length === o.days ? o.order : baseSeq;
  const choices = [...new Set(baseSeq)];

  const steps = [
    { key: 'days', h: '¿Cuántos días a la semana quieres entrenar?', p: 'Elige los que puedas mantener de verdad. La constancia gana a la intensidad.', ok: true },
    { key: 'goal', h: '¿Cuál es tu objetivo?', p: 'Define las series, las repeticiones y los descansos de cada ejercicio.', ok: true },
    { key: 'split', h: '¿Cómo quieres repartir el entreno?', p: `Opciones que encajan con ${o.days} días a la semana.`, ok: !!SPLITS[o.split]?.days[o.days] },
    { key: 'weekdays', h: '¿Qué días vas a entrenar?', p: `Marca ${o.days} días. Intenta dejar al menos un día de descanso entre sesiones iguales.`, ok: o.weekdays.length === o.days },
    { key: 'level', h: '¿Cuál es tu nivel?', p: 'Ajusta cuántos ejercicios y series hay en cada sesión.', ok: true },
    { key: 'equip', h: '¿Dónde entrenas?', p: 'Elegimos ejercicios que puedas hacer con tu material.', ok: true },
    { key: 'prio', h: '¿Quieres priorizar algún músculo?', p: 'Opcional. Elige hasta dos: tendrán más series y un ejercicio extra.', ok: true },
    ...(o.equip === 'gym' ? [{ key: 'lifts', h: '¿Cuánto levantas en los básicos?', p: 'Opcional. Con tus marcas te dejamos el peso exacto de cada serie desde el primer día. Pon un peso y las repeticiones que hiciste a tope, o un 1RM con 1 repetición.', ok: true }] : []),
    { key: 'exercises', h: '¿Qué ejercicios quieres hacer?', p: 'Esto es lo que te proponemos. Quita, cambia o añade los que quieras.', ok: !!draft && draft.routines.every(r => r.exercises.length > 0) },
    { key: 'preview', h: 'Tu plan', p: 'Revísalo. Después podrás cambiar cualquier ejercicio, serie o descanso desde la rutina.', ok: true },
  ];
  const st = steps[step];
  const sig = JSON.stringify([o.days, o.goal, o.split, o.weekdays, o.level, o.equip, o.priorities, o.order]);
  const fresh = () => generatePlan({ ...o, marks, bodyKg, order: o.order && o.order.length === o.days ? o.order : null });
  const next = () => {
    const nk = steps[step + 1].key;
    if (nk === 'exercises' && (!draft || draft.sig !== sig)) setDraft({ sig, ...fresh() });
    setStep(step + 1);
  };
  const editRoutine = (ri, fn) => setDraft(d => ({ ...d, routines: d.routines.map((r, i) => i === ri ? { ...r, exercises: fn(r.exercises) } : r) }));
  const defaultEx = exId => {
    const [sets, repMin, repMax, rest] = SCHEME_OF(o.goal, 'acc');
    return { exId, sets, rest, repMin, repMax, role: 'acc' };
  };
  const loadText = e => { const l = startingLoad(e.exId, lifts.lifts, e.repMin, o.level); return l ? ` · ${fmtNum(toUnit(l.kg, unit), 1)} ${unit}` : ''; };

  const setDays = d => {
    const sp = splitsFor(d);
    set({ days: d, order: null, weekdays: DEFAULT_DAYS[d], split: sp.find(x => x.value === o.split) ? o.split : (d <= 3 ? 'full' : sp[0].value) });
  };
  const toggleDay = wd => set({ weekdays: o.weekdays.includes(wd) ? o.weekdays.filter(x => x !== wd) : o.weekdays.length < o.days ? [...o.weekdays, wd] : o.weekdays });
  const togglePrio = p => set({ priorities: o.priorities.includes(p) ? o.priorities.filter(x => x !== p) : o.priorities.length < 2 ? [...o.priorities, p] : o.priorities });

  const create = async () => {
    if (s.plan) {
      const ok = await confirmDialog({ title: 'Reemplazar tu plan actual', message: 'Las rutinas del plan anterior se eliminarán. Tu historial de entrenos se conserva.', confirm: 'Reemplazar', danger: true });
      if (!ok) return;
    }
    const plan = { ...draft.plan, lifts: lifts.lifts, known: lifts.known };
    const routines = draft.routines;
    setState(x => ({ ...x, plan, routines: [...routines, ...x.routines.filter(r => !x.plan || r.planId !== x.plan.id)] }));
    toast('Plan creado');
    onCreated();
  };

  const sortedWd = [...o.weekdays].sort((a, b) => a - b);

  if (picker) {
    return <ExercisePicker single={picker.mode === 'replace'} onClose={() => setPicker(null)} onDone={ids => {
      if (picker.mode === 'replace') editRoutine(picker.ri, xs => xs.map((e, k) => k === picker.i ? { ...e, exId: ids[0] } : e));
      else editRoutine(picker.ri, xs => [...xs, ...ids.map(defaultEx)]);
      setPicker(null);
    }} />;
  }

  return (
    <div className="overlay-page wiz">
      <div className="wiz-top">
        <div className="row-between">
          <button className="icon-btn" onClick={() => step ? setStep(step - 1) : onClose()} aria-label={step ? 'Atrás' : 'Cerrar'}><Icon name={step ? 'chevronL' : 'x'} size={24} /></button>
          <span className="muted small">{step + 1} de {steps.length}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar" style={{ visibility: step ? 'visible' : 'hidden' }}><Icon name="x" size={22} /></button>
        </div>
        <div className="wiz-bar"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <div className="wiz-body" key={step}>
        <div className="wiz-step">Plan de entrenamiento</div>
        <h1 className="wiz-h">{st.h}</h1>
        <p className="wiz-p">{st.p}</p>

        {st.key === 'days' && (
          <div className="num-grid">
            {[2, 3, 4, 5, 6].map(d => (
              <button key={d} className={`num-opt ${o.days === d ? 'on' : ''}`} onClick={() => setDays(d)}>{d}<small>días</small></button>
            ))}
          </div>
        )}
        {st.key === 'goal' && GOALS.map(g => <Opt key={g.value} on={o.goal === g.value} onClick={() => set({ goal: g.value })} title={g.label} desc={g.desc} />)}
        {st.key === 'split' && splits.map(sp => (
          <Opt key={sp.value} on={o.split === sp.value} onClick={() => set({ split: sp.value, order: null })} title={sp.label}
            desc={<>{sp.desc}<br /><span style={{ color: 'var(--text-3)' }}>Rutinas: {[...new Set(sp.days[o.days])].map(routineName).join(', ')}</span></>} />
        ))}
        {st.key === 'weekdays' && (
          <>
            <div className="day-grid">
              {WEEKDAYS_S.map((d, i) => <button key={i} className={`day-opt ${o.weekdays.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)} aria-label={WEEKDAYS[i]}>{d}</button>)}
            </div>
            <div className="muted small mt12">{o.weekdays.length} de {o.days} seleccionados</div>
            {o.weekdays.length === o.days && (
              <div className="day-map">
                <div className="muted small">Toca un día para elegir qué rutina haces</div>
                {sortedWd.map((wd, i) => (
                  <button key={wd} className="day-map-row" onClick={async () => {
                    const v = await actionSheet({ title: WEEKDAYS[wd], items: choices.map(k => ({ label: routineName(k), value: k, active: seq[i] === k })) });
                    if (v) { const next = [...seq]; next[i] = v; set({ order: next }); }
                  }}>
                    <span>{WEEKDAYS[wd]}</span>
                    <span className="row-gap"><span className="strong">{routineName(seq[i])}</span><Icon name="chevronD" size={16} /></span>
                  </button>
                ))}
                {choices.some(k => !seq.includes(k)) && <div className="banner amber" style={{ marginTop: 4 }}><Icon name="info" size={18} /><div className="banner-s" style={{ marginTop: 0, color: 'var(--amber)' }}>No has asignado {choices.filter(k => !seq.includes(k)).map(routineName).join(' ni ')}: esa rutina no se creará.</div></div>}
              </div>
            )}
          </>
        )}
        {st.key === 'level' && LEVELS.map(l => <Opt key={l.value} on={o.level === l.value} onClick={() => set({ level: l.value })} title={l.label} desc={l.desc} />)}
        {st.key === 'equip' && EQUIP.map(l => <Opt key={l.value} on={o.equip === l.value} onClick={() => set({ equip: l.value })} title={l.label} desc={l.desc} />)}
        {st.key === 'prio' && (
          <>
            <Opt multi on={o.priorities.length === 0} onClick={() => set({ priorities: [] })} title="Ninguno, equilibrado" desc="Todos los grupos musculares por igual." />
            {PRIORITIES.map(p => <Opt multi key={p} on={o.priorities.includes(p)} onClick={() => togglePrio(p)} title={p} />)}
          </>
        )}
        {st.key === 'lifts' && (
          <>
            {BASE_LIFTS.map(l => {
              const i = inputs[l.key] || {};
              const m = marks[l.key];
              return (
                <div key={l.key} className="card mark-row">
                  <div className="row-between">
                    <div className="row-title">{l.label}</div>
                    {m ? <span className="mark-est">1RM {fmtNum(toUnit(m, unit), 1)} {unit}</span> : <span className="muted small">Lo estimamos</span>}
                  </div>
                  <div className="mark-in">
                    <label><input inputMode="decimal" placeholder={unit} value={i.kg || ''} onChange={e => setInputs(x => ({ ...x, [l.key]: { ...x[l.key], kg: e.target.value.replace(/[^0-9.,]/g, '') } }))} aria-label={`${l.label} peso`} /></label>
                    <span className="muted">×</span>
                    <label><input inputMode="numeric" placeholder="reps" value={i.reps || ''} onChange={e => setInputs(x => ({ ...x, [l.key]: { ...x[l.key], reps: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) } }))} aria-label={`${l.label} repeticiones`} /></label>
                  </div>
                </div>
              );
            })}
            <div className="muted small mt12">Lo que dejes vacío lo calculamos con tu nivel{bodyKg ? ' y tu peso corporal' : ''}{lifts.known.length ? ' y con lo que sí has puesto' : ''}. Siempre podrás ajustar el peso dentro del entreno.</div>
          </>
        )}
        {st.key === 'exercises' && draft && (
          <>
            {draft.routines.map((r, ri) => (
              <div key={r.id} className="card prev-routine">
                <div className="row-title">{r.name}</div>
                <div className="mt8">
                  {r.exercises.map((e, i) => (
                    <div key={e.exId + i} className="ex-edit">
                      <div className="ex-edit-main">
                        <div className="ex-edit-name">{getExercise(e.exId, s).name}</div>
                        <button className="ex-edit-scheme" onClick={async () => {
                          const v = await actionSheet({ title: 'Series de ' + getExercise(e.exId, s).name, items: [1, 2, 3, 4, 5, 6].map(n => ({ label: `${n} ${n === 1 ? 'serie' : 'series'}`, value: n, active: e.sets === n })) });
                          if (v) editRoutine(ri, xs => xs.map((x, k) => k === i ? { ...x, sets: v } : x));
                        }}>{e.sets}×{e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`}{loadText(e)} <Icon name="edit" size={13} /></button>
                      </div>
                      <button className="ex-edit-btn" aria-label="Cambiar ejercicio" onClick={() => setPicker({ ri, i, mode: 'replace' })}><Icon name="swap" size={19} /></button>
                      <button className="ex-edit-btn danger" aria-label="Quitar ejercicio" onClick={() => editRoutine(ri, xs => xs.filter((_, k) => k !== i))}><Icon name="trash" size={19} /></button>
                    </div>
                  ))}
                </div>
                <button className="text-btn mt8" onClick={() => setPicker({ ri, mode: 'add' })}><Icon name="plus" size={16} /> Añadir ejercicio</button>
              </div>
            ))}
            <div className="muted small">Usa el icono de intercambio para cambiar un ejercicio por otro, la papelera para quitarlo y toca las series para modificarlas.</div>
          </>
        )}
        {st.key === 'preview' && draft && (
          <>
            <div className="card">
              <div className="row-title">{draft.plan.name}</div>
              <div className="row-sub">{GOALS.find(g => g.value === o.goal).label} · {LEVELS.find(l => l.value === o.level).label} · {EQUIP.find(e => e.value === o.equip).label}{o.priorities.length ? ` · Prioridad: ${o.priorities.join(' y ')}` : ''}</div>
              <div className="day-map">
                {draft.plan.schedule.map(sc => <div key={sc.weekday}><span>{WEEKDAYS[sc.weekday]}</span><span className="strong">{draft.routines.find(r => r.id === sc.routineId).name}</span></div>)}
              </div>
              <div className="muted small mt12">Descarga programada cada {draft.plan.deloadEvery} semanas.</div>
            </div>
            <div className="list-label">Rutinas</div>
            {draft.routines.map(r => (
              <div key={r.id} className="card prev-routine">
                <div className="row-title">{r.name}</div>
                <div className="mt8">
                  {r.exercises.map(e => (
                    <div key={e.exId} className="prev-line">
                      <span className="ellipsis">{getExercise(e.exId, s).name}</span>
                      <span className="scheme">{e.sets}×{e.repMin === e.repMax ? e.repMin : `${e.repMin}-${e.repMax}`}{loadText(e)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="wiz-cta">
        {step < steps.length - 1
          ? <button className="btn btn-primary btn-block btn-lg" disabled={!st.ok} onClick={next}>Continuar</button>
          : <button className="btn btn-primary btn-block btn-lg" onClick={create}><Icon name="check" size={20} stroke={2.5} /> Crear plan</button>}
      </div>
    </div>
  );
}

const NAMES = { TA: 'Torso A', TB: 'Torso B', PA: 'Pierna A', PB: 'Pierna B', FA: 'Full body A', FB: 'Full body B', FC: 'Full body C', PU: 'Push', PL: 'Pull', LG: 'Legs', PU2: 'Push B', PL2: 'Pull B', LG2: 'Legs B' };
const routineName = k => NAMES[k] || k;

// Tarjeta de Inicio
export function PlanCard({ nav, onCreate }) {
  const s = useStore();
  if (!s.plan) {
    return (
      <button className="card card-btn plan-card mt16" onClick={onCreate}>
        <div className="plan-k">Nuevo</div>
        <div className="plan-today" style={{ fontSize: 21 }}>Crea tu plan de entrenamiento</div>
        <div className="plan-sub">Responde unas preguntas y te preparamos las rutinas, las series y los días de la semana.</div>
        <div className="btn btn-primary btn-block mt12"><Icon name="zap" size={18} /> Crear mi plan</div>
      </button>
    );
  }
  const plan = s.plan;
  const info = planToday(plan, s.workouts);
  const rName = id => (s.routines.find(r => r.id === id) || {}).name || 'Rutina eliminada';
  const week = planWeek(plan);
  const deloadWeek = isPlanDeloadWeek(plan);
  const ws = weekStart(new Date());
  const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(ws, i)));
  const doneOn = d => s.workouts.some(w => w.date === d && plan.schedule.some(x => x.routineId === w.routineId));
  const todayIso = todayISO();
  const target = info.today && !info.doneToday ? info.today : info.next;
  const targetExists = target && s.routines.some(r => r.id === target.routineId);

  return (
    <div className="card plan-card mt16">
      <div className="row-between">
        <div className="plan-k">{plan.coach ? 'Programa del entrenador' : `Semana ${week} de tu plan${deloadWeek ? ' · descarga' : ''}`}</div>
        <button className="text-btn sm" onClick={() => nav.push('plan')}>Ver plan <Icon name="chevronR" size={14} /></button>
      </div>
      {info.today && !info.doneToday ? (
        <>
          <div className="plan-today">Hoy toca: {rName(info.today.routineId)}</div>
          <div className="plan-sub">{(s.routines.find(r => r.id === info.today.routineId) || { exercises: [] }).exercises.length} ejercicios</div>
        </>
      ) : info.today && info.doneToday ? (
        <>
          <div className="plan-today">Hecho por hoy</div>
          <div className="plan-sub">{info.next ? `Próximo: ${rName(info.next.routineId)} ${info.next.inDays === 1 ? 'mañana' : DAY_NAMES_LOWER[info.next.weekday]}` : ''}</div>
        </>
      ) : (
        <>
          <div className="plan-today">Hoy toca descansar</div>
          <div className="plan-sub">{info.next ? `Próximo: ${rName(info.next.routineId)} ${info.next.inDays === 1 ? 'mañana' : DAY_NAMES_LOWER[info.next.weekday]}` : ''}</div>
        </>
      )}
      {plan.coach && plan.note && <div className="plan-sub mt8">{plan.note}</div>}
      <div className="plan-week">
        {days.map((d, i) => {
          const e = plan.schedule.find(x => x.weekday === i);
          const done = e && doneOn(d);
          return (
            <div key={d} className="pw">
              <span className="pw-l">{WEEKDAYS_S[i]}</span>
              <span className={`pw-d ${e ? 'train' : ''} ${done ? 'done' : ''} ${d === todayIso ? 'today' : ''}`}>
                {done ? <Icon name="check" size={16} stroke={3} /> : e ? shortName(rName(e.routineId)) : ''}
              </span>
            </div>
          );
        })}
      </div>
      {targetExists && (
        <button className={`btn ${info.today && !info.doneToday ? 'btn-primary' : 'btn-secondary'} btn-block mt12`} onClick={() => guardStart(() => startWorkout({ routineId: target.routineId }))}>
          <Icon name="play" size={16} /> {info.today && !info.doneToday ? `Empezar ${rName(target.routineId)}` : `Adelantar ${rName(target.routineId)}`}
        </button>
      )}
    </div>
  );
}

function shortName(n) {
  const m = n.match(/^(Torso|Pierna|Full body|Push|Pull|Legs)\s*([AB C]?)/);
  if (!m) return n.slice(0, 3);
  const base = { Torso: 'T', Pierna: 'P', 'Full body': 'FB', Push: 'Push', Pull: 'Pull', Legs: 'Legs' }[m[1]];
  return base + (m[2] || '').trim();
}

export function PlanDetail({ onBack, nav, onRedo }) {
  const s = useStore();
  const plan = s.plan;
  if (!plan) return <div className="page"><TopBar title="Plan" onBack={onBack} /><div className="empty-inline">No tienes un plan activo.</div></div>;
  const rOf = id => s.routines.find(r => r.id === id);
  const planRoutines = s.routines.filter(r => r.planId === plan.id);

  const menu = async () => {
    const v = await actionSheet({ title: plan.name, items: [
      { label: 'Rehacer el plan', icon: 'refresh', value: 'redo' },
      { label: 'Eliminar el plan', icon: 'trash', value: 'del', danger: true },
    ] });
    if (v === 'redo') onRedo();
    if (v === 'del') {
      const k = await confirmDialog({ title: '¿Eliminar el plan?', message: '¿Quieres conservar sus rutinas como rutinas normales?', options: [
        { label: 'Eliminar plan y conservar rutinas', value: 'keep', primary: true },
        { label: 'Eliminar plan y rutinas', value: 'all', danger: true },
        { label: 'Cancelar', value: null },
      ] });
      if (!k) return;
      setState(x => ({ ...x, plan: null, routines: k === 'all' ? x.routines.filter(r => r.planId !== plan.id) : x.routines.map(r => r.planId === plan.id ? { ...r, planId: undefined } : r) }));
      toast('Plan eliminado');
      onBack();
    }
  };

  const moveDay = async sc => {
    const what = await actionSheet({ title: `${WEEKDAYS[sc.weekday]} · ${(rOf(sc.routineId) || {}).name || ''}`, items: [
      { label: 'Cambiar la rutina de este día', icon: 'swap', value: 'routine' },
      { label: 'Mover a otro día', icon: 'calendar', value: 'day' },
    ] });
    if (what === 'routine') {
      const opts = s.routines.filter(r => r.planId === plan.id);
      const v = await actionSheet({ title: `¿Qué haces el ${WEEKDAYS[sc.weekday].toLowerCase()}?`, items: opts.map(r => ({ label: r.name, value: r.id, active: r.id === sc.routineId })) });
      if (!v) return;
      setState(x => ({ ...x, plan: { ...x.plan, schedule: x.plan.schedule.map(y => y.weekday === sc.weekday ? { ...y, routineId: v } : y) } }));
    }
    if (what === 'day') {
      const free = WEEKDAYS.map((d, i) => i).filter(i => i === sc.weekday || !plan.schedule.some(x => x.weekday === i));
      const v = await actionSheet({ title: `¿Qué día haces ${(rOf(sc.routineId) || {}).name}?`, items: free.map(i => ({ label: WEEKDAYS[i], value: String(i), active: i === sc.weekday })) });
      if (v === null) return;
      setState(x => ({ ...x, plan: { ...x.plan, schedule: x.plan.schedule.map(y => y.weekday === sc.weekday ? { ...y, weekday: Number(v) } : y).sort((a, b) => a.weekday - b.weekday) } }));
    }
  };

  return (
    <div className="page">
      <TopBar title="Mi plan" onBack={onBack} right={<button className="icon-btn" onClick={menu} aria-label="Opciones"><Icon name="more" size={22} /></button>} />
      <div className="page-body">
        <div className="card plan-card">
          <div className="plan-k">Semana {planWeek(plan)} · desde {fmtDate(plan.startDate)}</div>
          <div className="plan-today" style={{ fontSize: 22 }}>{plan.name}</div>
          {plan.coach ? <>
            {plan.note && <div className="plan-sub">{plan.note}</div>}
            <div className="plan-sub">Lo actualiza tu entrenador. Las descargas y subidas de peso vienen en el programa.</div>
          </> : <>
          <div className="plan-sub">{GOALS.find(g => g.value === plan.goal).label} · {LEVELS.find(l => l.value === plan.level).label} · {EQUIP.find(e => e.value === plan.equip).label}</div>
          {plan.priorities && plan.priorities.length > 0 && <div className="plan-sub">Prioridad: {plan.priorities.join(' y ')}</div>}
          <div className="plan-sub">Descarga cada {plan.deloadEvery} semanas{isPlanDeloadWeek(plan) ? ' · esta semana toca' : ` · próxima en la semana ${Math.ceil(planWeek(plan) / plan.deloadEvery) * plan.deloadEvery}`}</div>
          </>}
        </div>

        <Section title="Semana tipo">
          <div className="card nopad">
            {plan.schedule.map(sc => (
              <button key={`${sc.weekday}-${sc.routineId}`} className="row" onClick={() => moveDay(sc)}>
                <div className="grow">
                  <div className="row-title">{WEEKDAYS[sc.weekday]}</div>
                  <div className="row-sub">{(rOf(sc.routineId) || {}).name || 'Rutina eliminada'}</div>
                </div>
                <span className="muted small">Cambiar</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Rutinas del plan">
          <div className="stack">
            {planRoutines.map(r => (
              <button key={r.id} className="card card-btn" onClick={() => nav.push('routine', { id: r.id })}>
                <div className="row-between"><div className="row-title">{r.name}</div><Icon name="chevronR" size={18} className="muted" /></div>
                <div className="mt8">
                  {r.exercises.map((e, i) => (
                    e.coachSets ? (
                      <div key={i} className="row-line" style={{ padding: '6px 0' }}>
                        <div className="ellipsis">{getExercise(e.exId, s).name}</div>
                        <div className="scheme" style={{ whiteSpace: 'normal', marginTop: 2 }}>{coachTargetText(e.coachSets)}</div>
                      </div>
                    ) : (
                    <div key={i} className="prev-line">
                      <span className="ellipsis">{getExercise(e.exId, s).name}</span>
                      <span className="scheme">{e.sets}×{e.repMin ? `${e.repMin}-${e.repMax}` : '—'}</span>
                    </div>)
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {!plan.coach && <Section title="Cómo progresar">
          <div className="card">
            <div className="row-sub" style={{ lineHeight: 1.55 }}>
              Cada ejercicio tiene un rango de repeticiones (por ejemplo 8-12). Cuando completes <b>todas las series en el máximo del rango</b>, la app te propondrá subir el peso la próxima vez (+2,5 kg en barra y máquinas, +2 kg en mancuernas, +1 kg en ejercicios ligeros) y volverás a la parte baja del rango.
            </div>
          </div>
        </Section>}
        {!plan.coach && <button className="btn btn-secondary btn-block mt24" onClick={onRedo}><Icon name="refresh" size={18} /> Rehacer el plan</button>}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
