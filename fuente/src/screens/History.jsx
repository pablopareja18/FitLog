import { copyForCoach } from '../coachProgram.js';
import React, { useMemo, useState } from 'react';
import { useStore, setState, getExercise } from '../store.js';
import { workoutVolume, workoutSets, bestSet, sortedWorkouts } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Empty, toast, confirmDialog, actionSheet, promptDialog } from '../ui.jsx';
import { fmtNum, fmtDate, fmtDuration, toUnit, MONTHS, DAYS_S, toISO, todayISO, parseISO, cap, e1rm , fmtSet } from '../utils.js';
import { editWorkout, startWorkout, routineFromWorkout } from '../workout.js';
import { guardStart } from './Train.jsx';
import { matchesQuery } from '../exercises.js';

export function HistoryTab({ nav }) {
  const s = useStore();
  const [q, setQ] = useState('');
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState(null);
  const unit = s.settings.unit;
  const byDate = useMemo(() => {
    const m = {};
    s.workouts.forEach(w => { (m[w.date] = m[w.date] || []).push(w); });
    return m;
  }, [s.workouts]);

  const list = useMemo(() => {
    let l = sortedWorkouts(s.workouts).reverse();
    if (day) l = l.filter(w => w.date === day);
    if (q.trim()) l = l.filter(w => matchesQuery({ name: w.name, aliases: w.exercises.map(e => getExercise(e.exId, s).name) }, q));
    return l;
  }, [s.workouts, q, day]);

  const grouped = useMemo(() => {
    const g = [];
    list.forEach(w => {
      const k = w.date.slice(0, 7);
      if (!g.length || g[g.length - 1].k !== k) g.push({ k, items: [] });
      g[g.length - 1].items.push(w);
    });
    return g;
  }, [list]);

  // Calendario del mes
  const first = month;
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : toISO(new Date(first.getFullYear(), first.getMonth(), i - offset + 1)));
  const monthCount = cells.filter(d => d && byDate[d]).length;
  const nextDisabled = first.getFullYear() === new Date().getFullYear() && first.getMonth() === new Date().getMonth();

  return (
    <div className="page">
      <TopBar title="Historial" large />
      <div className="page-body">
        {s.workouts.length === 0 ? (
          <Empty icon="history" title="Aún no hay entrenos" text="Cuando termines tu primer entreno aparecerá aquí." />
        ) : (
          <>
            <div className="card cal">
              <div className="cal-head">
                <button className="icon-btn" onClick={() => { setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1)); setDay(null); }} aria-label="Mes anterior"><Icon name="chevronL" size={20} /></button>
                <div className="cal-title">{cap(MONTHS[first.getMonth()])} {first.getFullYear()}<span className="muted small"> · {monthCount} {monthCount === 1 ? 'día' : 'días'}</span></div>
                <button className="icon-btn" disabled={nextDisabled} onClick={() => { setMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1)); setDay(null); }} aria-label="Mes siguiente"><Icon name="chevronR" size={20} /></button>
              </div>
              <div className="cal-grid">
                {DAYS_S.map(d => <div key={d} className="cal-dow">{d}</div>)}
                {cells.map((d, i) => d ? (
                  <button key={d} className={`cal-day ${byDate[d] ? 'has' : ''} ${d === todayISO() ? 'today' : ''} ${day === d ? 'sel' : ''}`}
                    disabled={!byDate[d]} onClick={() => setDay(day === d ? null : d)}>{parseISO(d).getDate()}</button>
                ) : <span key={`e${i}`} />)}
              </div>
            </div>

            <div className="search mt16">
              <Icon name="search" size={18} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por rutina o ejercicio" aria-label="Buscar en el historial" />
              {q && <button className="icon-btn sm" onClick={() => setQ('')} aria-label="Borrar"><Icon name="x" size={16} /></button>}
            </div>
            {day && <button className="chip on mt12" onClick={() => setDay(null)}>{fmtDate(day, { weekday: true })} <Icon name="x" size={14} /></button>}

            {grouped.length === 0 && <div className="empty-inline">No hay entrenos que coincidan.</div>}
            {grouped.map(g => {
              const [y, m] = g.k.split('-').map(Number);
              return (
                <div key={g.k}>
                  <div className="list-label">{cap(MONTHS[m - 1])} {y} · {g.items.length} {g.items.length === 1 ? 'entreno' : 'entrenos'}</div>
                  <div className="stack">{g.items.map(w => <WorkoutCard key={w.id} w={w} s={s} unit={unit} onClick={() => nav.push('workout', { id: w.id })} />)}</div>
                </div>
              );
            })}
          </>
        )}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

export function WorkoutCard({ w, s, unit, onClick }) {
  return (
    <button className="card card-btn wcard" onClick={onClick}>
      <div className="row-between">
        <div className="minw0">
          <div className="row-title ellipsis">{w.name}{w.deload && <span className="tag amber">Descarga</span>}</div>
          <div className="row-sub">{fmtDate(w.date, { weekday: true })}</div>
        </div>
        <Icon name="chevronR" size={18} className="muted" />
      </div>
      <div className="wcard-stats">
        <span><Icon name="timer" size={14} /> {fmtDuration(w.duration)}</span>
        <span><Icon name="dumbbell" size={14} /> {fmtNum(toUnit(workoutVolume(w), unit))} {unit}</span>
        <span><Icon name="layers" size={14} /> {workoutSets(w)} series</span>
      </div>
      <div className="wcard-ex">
        {w.exercises.slice(0, 5).map(e => {
          const b = bestSet(e.sets);
          return (
            <div key={e.exId} className="wcard-line">
              <span className="ellipsis">{e.sets.length} × {getExercise(e.exId, s).name}</span>
              {b && <span className="tnum muted">{fmtSet(b.kg, b.reps, unit, false)}</span>}
            </div>
          );
        })}
        {w.exercises.length > 5 && <div className="muted small">y {w.exercises.length - 5} ejercicios más</div>}
      </div>
    </button>
  );
}

export function WorkoutDetail({ id, onBack, nav }) {
  const s = useStore();
  const w = s.workouts.find(x => x.id === id);
  const unit = s.settings.unit;
  if (!w) return <div className="page"><TopBar title="Entreno" onBack={onBack} /><Empty title="Entreno no encontrado" /></div>;

  const menu = async () => {
    const v = await actionSheet({ title: w.name, items: [
      { label: 'Copiar para el entrenador', icon: 'copy', value: 'coach' },
      { label: 'Editar entreno', icon: 'edit', value: 'edit' },
      { label: 'Repetir este entreno', icon: 'play', value: 'repeat' },
      { label: 'Guardar como rutina', icon: 'list', value: 'routine' },
      { label: 'Eliminar entreno', icon: 'trash', value: 'del', danger: true },
    ] });
    if (v === 'coach') { const r = await copyForCoach(w); toast(r === 'copied' ? 'Copiado. Pégalo en el chat del entrenador' : r ? 'Listo' : 'No se pudo copiar'); }
    if (v === 'edit') guardStart(() => editWorkout(w));
    if (v === 'repeat') guardStart(() => startWorkout({ fromWorkout: w }));
    if (v === 'routine') {
      const name = await promptDialog({ title: 'Nombre de la rutina', defaultValue: w.name, confirm: 'Guardar' });
      if (name) { routineFromWorkout(w, name.trim()); toast('Rutina creada'); }
    }
    if (v === 'del' && await confirmDialog({ title: '¿Eliminar este entreno?', message: 'No se puede deshacer.', confirm: 'Eliminar', danger: true })) {
      setState(x => ({ ...x, workouts: x.workouts.filter(y => y.id !== w.id) }));
      toast('Entreno eliminado');
      onBack();
    }
  };

  return (
    <div className="page">
      <TopBar title={w.name} sub={fmtDate(w.date, { weekday: true, year: true })} onBack={onBack}
        right={<button className="icon-btn" onClick={menu} aria-label="Opciones"><Icon name="more" size={22} /></button>} />
      <div className="page-body">
        <div className="stat-row">
          <div><div className="ws-v">{fmtDuration(w.duration)}</div><div className="ws-k">duración</div></div>
          <div><div className="ws-v">{fmtNum(toUnit(workoutVolume(w), unit))}</div><div className="ws-k">{unit} volumen</div></div>
          <div><div className="ws-v">{workoutSets(w)}</div><div className="ws-k">series</div></div>
        </div>
        {w.notes && <div className="ex-note">{w.notes}</div>}
        <div className="stack mt16">
          {w.exercises.map(e => {
            const ex = getExercise(e.exId, s);
            let n = 0;
            return (
              <div key={e.exId} className="card">
                <button className="ex-title" onClick={() => nav.push('exercise', { id: e.exId })}><span className="ellipsis">{ex.name}</span><Icon name="chevronR" size={16} /></button>
                {e.notes && <div className="ex-note">{e.notes}</div>}
                <div className="set-lines">
                  {e.sets.map((x, i) => (
                    <div key={i} className="set-line">
                      <span className={`set-dot t-${x.type || 'N'}`}>{x.type === 'W' ? 'C' : ++n}</span>
                      <span className="tnum">{fmtSet(x.kg, x.reps, unit)}</span>
                      {x.rir !== null && x.rir !== undefined && <span className="muted small">RIR {x.rir}</span>}
                      <span className="grow" />
                      {x.type !== 'W' && x.kg > 0 && <span className="muted small tnum">1RM ≈ {fmtNum(toUnit(e1rm(x.kg, x.reps), unit), 0)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row-gap mt16">
          <button className="btn btn-secondary grow" onClick={() => guardStart(() => editWorkout(w))}><Icon name="edit" size={16} /> Editar</button>
          <button className="btn btn-secondary grow" onClick={() => guardStart(() => startWorkout({ fromWorkout: w }))}><Icon name="play" size={16} /> Repetir</button>
        </div>
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
