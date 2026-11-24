import React, { useMemo, useRef, useState } from 'react';
import { useStore, useActive, setActive, getState, getExercise } from '../store.js';
import { exerciseStats, previousSets, isWork } from '../stats.js';
import { Icon } from '../icons.jsx';
import { toast, confirmDialog, actionSheet, promptDialog, useNow } from '../ui.jsx';
import { fmtClock, fmtNum, parseNum, fromUnit, toUnit, uid, vibrate, unlockAudio, fmtDate, todayISO, relDate , fmtSet } from '../utils.js';
import { activeCounts, saveActive, makeExercise, kgText, setHasData } from '../workout.js';
import { ExercisePicker } from './ExercisePicker.jsx';
import { ExerciseDetail } from './ExerciseDetail.jsx';

const TYPE_LABEL = { W: 'C', D: 'D', F: 'F' };
const TYPE_NAME = { N: 'Normal', W: 'Calentamiento', D: 'Drop set', F: 'Al fallo' };
const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
const restLabel = s => s ? fmtClock(s) : 'Sin descanso';

function upd(fn) { setActive(a => a ? fn(a) : a); }
function updEx(euid, fn) { upd(a => ({ ...a, exercises: a.exercises.map(e => e.uid === euid ? fn(e) : e) })); }
function updSet(euid, suid, patch) { updEx(euid, e => ({ ...e, sets: e.sets.map(x => x.uid === suid ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x) })); }

export function ActiveWorkout({ onFinished }) {
  const a = useActive();
  const s = useStore();
  const now = useNow(1000, !!a && !a.editing);
  const [picker, setPicker] = useState(null); // {mode:'add'} | {mode:'replace', euid}
  const [detail, setDetail] = useState(null);
  const dateRef = useRef(null);
  if (!a) return null;
  const unit = a.unit;
  const counts = activeCounts(a);
  const vol = a.exercises.reduce((t, e) => t + e.sets.reduce((u, x) => u + (x.done && x.type !== 'W' ? fromUnit(parseNum(x.kg) || 0, unit) * (parseNum(x.reps) || 0) : 0), 0), 0);
  const elapsed = a.editing ? (a.duration || 0) : (now - a.startedAt) / 1000;

  const finish = async () => {
    unlockAudio();
    const c = activeCounts(a);
    let mode = 'done';
    if (a.editing) {
      mode = 'all';
    } else if (c.done === 0 && c.pendingWithData === 0) {
      const v = await confirmDialog({ title: 'No hay series registradas', message: 'Marca al menos una serie como hecha para guardar el entreno.', options: [{ label: 'Descartar entreno', value: 'discard', danger: true }, { label: 'Seguir entrenando', value: null, primary: true }] });
      if (v === 'discard') { setActive(null); onFinished(null); }
      return;
    } else if (c.pendingWithData > 0) {
      const v = await confirmDialog({
        title: 'Hay series sin marcar',
        message: `${c.pendingWithData} ${c.pendingWithData === 1 ? 'serie tiene' : 'series tienen'} datos pero no ${c.pendingWithData === 1 ? 'está marcada' : 'están marcadas'}. Los ejercicios sin series completadas no se guardarán.`,
        options: [
          { label: 'Marcar todas y terminar', value: 'all', primary: true },
          { label: 'Guardar solo las completadas', value: 'done' },
          { label: 'Seguir entrenando', value: null },
        ],
      });
      if (!v) return;
      mode = v;
    } else {
      const skipped = a.exercises.filter(e => !e.sets.some(x => x.done)).length;
      const ok = await confirmDialog({
        title: '¿Terminar entreno?',
        message: skipped ? `${skipped} ${skipped === 1 ? 'ejercicio no tiene' : 'ejercicios no tienen'} series completadas y no se ${skipped === 1 ? 'guardará' : 'guardarán'}.` : 'Se guardará en tu historial.',
        confirm: 'Terminar',
      });
      if (!ok) return;
    }
    const res = saveActive(mode);
    if (!res) { toast('No hay series que guardar', 'error'); return; }
    onFinished(res);
  };

  const discard = async () => {
    const ok = await confirmDialog({ title: a.editing ? '¿Descartar cambios?' : '¿Descartar entreno?', message: a.editing ? 'El entreno guardado no se modificará.' : 'Se perderá todo lo registrado en esta sesión.', confirm: 'Descartar', danger: true });
    if (ok) { setActive(null); onFinished(null); }
  };

  const addExercises = ids => {
    const exs = ids.map(id => makeExercise(id));
    upd(x => ({ ...x, exercises: [...x.exercises, ...exs] }));
    setPicker(null);
  };
  const replaceExercise = (euid, id) => {
    const ne = makeExercise(id);
    updEx(euid, e => ({ ...ne, uid: e.uid, rest: e.rest }));
    setPicker(null);
  };

  return (
    <div className="overlay-page workout">
      <header className="wo-top">
        <button className="icon-btn" onClick={() => a.editing ? discard() : upd(x => ({ ...x, minimized: true }))} aria-label={a.editing ? 'Cerrar' : 'Minimizar'}>
          <Icon name={a.editing ? 'x' : 'chevronD'} size={26} />
        </button>
        <div className="wo-top-mid">
          {a.editing ? <span className="wo-top-label">Editar entreno</span> : <span className="wo-top-label">{counts.done} de {counts.total} series</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={finish}>{a.editing ? 'Guardar' : 'Terminar'}</button>
      </header>

      <div className="page-body wo-body">
        <input className="wo-name" value={a.name} onChange={e => upd(x => ({ ...x, name: e.target.value }))} aria-label="Nombre del entreno" />
        <div className="wo-meta">
          <button className="meta-chip" onClick={() => dateRef.current && (dateRef.current.showPicker ? dateRef.current.showPicker() : dateRef.current.click())}>
            <Icon name="calendar" size={15} /> {a.date === todayISO() ? 'Hoy' : fmtDate(a.date, { weekday: true })}
            <input ref={dateRef} type="date" className="hidden-date" value={a.date} max={todayISO()} onChange={e => e.target.value && upd(x => ({ ...x, date: e.target.value }))} />
          </button>
          {a.deload && <span className="meta-chip amber"><Icon name="battery" size={15} /> Descarga · 60%</span>}
        </div>

        {!a.editing && (
          <div className="wo-clock">
            <div className="wo-clock-time">{fmtClock(elapsed)}</div>
            <div className="wo-clock-stats">
              <div><span className="k">Volumen</span><span className="v">{fmtNum(toUnit(vol, unit))} {unit}</span></div>
              <div><span className="k">Series</span><span className="v">{counts.done}</span></div>
            </div>
          </div>
        )}

        {a.exercises.length === 0 && (
          <div className="empty-inline">
            <div className="empty-title">Entreno vacío</div>
            Añade los ejercicios que vayas a hacer.
          </div>
        )}

        {a.exercises.map((e, i) => (
          <ExerciseBlock key={e.uid} e={e} index={i} total={a.exercises.length} a={a} s={s}
            onDetail={() => setDetail(e.exId)} onReplace={() => setPicker({ mode: 'replace', euid: e.uid })} />
        ))}

        <button className="btn btn-secondary btn-block mt16" onClick={() => setPicker({ mode: 'add' })}><Icon name="plus" size={18} /> Añadir ejercicios</button>
        <button className="btn btn-ghost-danger btn-block mt8" onClick={discard}>{a.editing ? 'Descartar cambios' : 'Descartar entreno'}</button>
        <div style={{ height: 120 }} />
      </div>

      {!a.editing && <RestBar a={a} now={now} />}

      {picker && <ExercisePicker single={picker.mode === 'replace'} onClose={() => setPicker(null)}
        onDone={ids => picker.mode === 'replace' ? replaceExercise(picker.euid, ids[0]) : addExercises(ids)} />}
      {detail && <div className="overlay-stack"><ExerciseDetail id={detail} onBack={() => setDetail(null)} /></div>}
    </div>
  );
}

function ExerciseBlock({ e, index, total, a, s, onDetail, onReplace }) {
  const ex = getExercise(e.exId, s);
  const unit = a.unit;
  const prev = useMemo(() => previousSets(s.workouts, e.exId, a.editing ? a.id : undefined), [s.workouts, e.exId]);
  const showRir = s.settings.showRir !== false;
  let n = 0;
  const labels = e.sets.map(x => x.type === 'W' ? 'C' : String(++n));

  const menu = async () => {
    const v = await actionSheet({
      title: ex.name,
      items: [
        { label: e.notes ? 'Editar nota' : 'Añadir nota', icon: 'note', value: 'note' },
        !a.editing && { label: 'Descanso', icon: 'timer', value: 'rest', hint: restLabel(e.rest) },
        { label: 'Reemplazar ejercicio', icon: 'swap', value: 'replace' },
        index > 0 && { label: 'Mover arriba', icon: 'arrowUp', value: 'up' },
        index < total - 1 && { label: 'Mover abajo', icon: 'arrowDown', value: 'down' },
        { label: 'Eliminar ejercicio', icon: 'trash', value: 'remove', danger: true },
      ],
    });
    if (v === 'note') {
      const t = await promptDialog({ title: 'Nota', defaultValue: e.notes, placeholder: 'Ej: agarre estrecho, asiento en 4', confirm: 'Guardar' });
      if (t !== null) updEx(e.uid, x => ({ ...x, notes: t.trim() }));
    } else if (v === 'rest') {
      const r = await actionSheet({ title: 'Descanso entre series', items: REST_OPTIONS.map(o => ({ label: restLabel(o), value: String(o), active: o === e.rest })) });
      if (r !== null) updEx(e.uid, x => ({ ...x, rest: Number(r) }));
    } else if (v === 'replace') onReplace();
    else if (v === 'up' || v === 'down') {
      upd(w => { const arr = [...w.exercises]; const j = v === 'up' ? index - 1 : index + 1; [arr[index], arr[j]] = [arr[j], arr[index]]; return { ...w, exercises: arr }; });
    } else if (v === 'remove') {
      const done = e.sets.some(x => x.done);
      if (!done || await confirmDialog({ title: '¿Eliminar ejercicio?', message: 'Se borrarán sus series de este entreno.', confirm: 'Eliminar', danger: true })) {
        upd(w => ({ ...w, exercises: w.exercises.filter(x => x.uid !== e.uid) }));
      }
    }
  };

  const setMenu = async x => {
    const v = await actionSheet({
      title: 'Tipo de serie',
      items: [
        ...['N', 'W', 'D', 'F'].map(t => ({ label: TYPE_NAME[t], value: t, active: (x.type || 'N') === t })),
        { label: 'Eliminar serie', icon: 'trash', value: 'del', danger: true },
      ],
    });
    if (!v) return;
    if (v === 'del') updEx(e.uid, y => ({ ...y, sets: y.sets.filter(z => z.uid !== x.uid) }));
    else updSet(e.uid, x.uid, { type: v });
  };

  const addSet = () => updEx(e.uid, y => {
    const last = y.sets[y.sets.length - 1];
    return { ...y, sets: [...y.sets, { uid: uid('s'), type: last && last.type === 'W' ? 'N' : (last?.type || 'N'), kg: last ? last.kg : '', reps: last ? last.reps : '', rir: '', done: false }] };
  });

  const toggle = (x, i) => {
    unlockAudio();
    if (x.done) { updSet(e.uid, x.uid, { done: false, pr: null }); return; }
    let kg = x.kg, reps = x.reps;
    const p = prev[i];
    if (!setHasData(x) && p) { kg = kgText(p.kg, unit); reps = String(p.reps); }
    if (!(parseNum(kg) > 0) && !(parseNum(reps) > 0)) { toast('Introduce peso o repeticiones', 'error'); return; }
    let pr = null;
    if (x.type !== 'W' && !a.editing) pr = detectPR(e, x, fromUnit(parseNum(kg) || 0, unit), Math.round(parseNum(reps) || 0), a, s, unit);
    updSet(e.uid, x.uid, { kg, reps, done: true, pr });
    vibrate(15);
    if (!a.editing && e.rest > 0) upd(w => ({ ...w, restEndsAt: Date.now() + e.rest * 1000, restTotal: e.rest, restFor: e.uid }));
  };

  return (
    <div className="ex-block">
      <div className="ex-head">
        <button className="ex-title" onClick={onDetail}>
          <span className="ellipsis">{ex.name}</span>
        </button>
        <button className="icon-btn" onClick={menu} aria-label="Opciones del ejercicio"><Icon name="more" size={22} /></button>
      </div>
      <div className="ex-sub">
        <span>{ex.muscle}</span>
        {e.target && <span className="target-chip"><Icon name="target" size={13} /> {e.sets.filter(x => x.type !== 'W').length}×{e.target.min}-{e.target.max}</span>}
        {!a.editing && <button className="rest-chip" onClick={menu}><Icon name="timer" size={13} /> {restLabel(e.rest)}</button>}
      </div>
      {e.suggest && !a.editing && (
        <div className="suggest">
          <Icon name="arrowUp" size={16} stroke={2.5} />
          <span>La última vez llegaste a {e.target.max} reps en todas las series: sube de {fmtNum(toUnit(e.suggestFrom, unit), 1)} a <b>{fmtNum(toUnit(e.suggest, unit), 1)} {unit}</b></span>
        </div>
      )}
      {e.coach && !e.suggest && !a.editing && (
        <div className="suggest">
          <Icon name="target" size={16} stroke={2.5} />
          <span>{e.coach}</span>
        </div>
      )}
      {e.notes && <div className="ex-note">{e.notes}</div>}

      <div className={`sets ${showRir ? 'with-rir' : ''}`}>
        <div className="set-row set-head">
          <span>Serie</span><span>Anterior</span><span>{unit}</span><span>Reps</span>{showRir && <span>RIR</span>}<span className="c"><Icon name="check" size={14} stroke={3} /></span>
        </div>
        {e.sets.map((x, i) => {
          const p = prev[i];
          return (
            <div key={x.uid} className={`set-row ${x.done ? 'done' : ''}`}>
              <button className={`set-label t-${x.type || 'N'}`} onClick={() => setMenu(x)} aria-label="Tipo de serie">{labels[i]}</button>
              <button className="set-prev" onClick={() => p && updSet(e.uid, x.uid, { kg: kgText(p.kg, unit), reps: String(p.reps) })} disabled={!p}>
                {p ? (p.kg > 0 ? `${kgText(p.kg, unit)} × ${p.reps}` : `PC × ${p.reps}`) : '—'}
              </button>
              <input className="set-in" inputMode="decimal" value={x.kg} placeholder={p ? kgText(p.kg, unit) : '0'} onFocus={ev => ev.target.select()}
                onChange={ev => updSet(e.uid, x.uid, { kg: ev.target.value.replace(/[^0-9.,]/g, '') })} aria-label="Peso" />
              <input className="set-in" inputMode="numeric" value={x.reps} placeholder={e.target && x.type !== 'W' ? `${e.target.min}-${e.target.max}` : p ? String(p.reps) : '0'} onFocus={ev => ev.target.select()}
                onChange={ev => updSet(e.uid, x.uid, { reps: ev.target.value.replace(/[^0-9]/g, '') })} aria-label="Repeticiones" />
              {showRir && <input className="set-in rir" inputMode="numeric" value={x.rir ?? ''} placeholder="—" onFocus={ev => ev.target.select()}
                onChange={ev => updSet(e.uid, x.uid, { rir: ev.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} aria-label="RIR" />}
              <button className={`set-check ${x.done ? 'on' : ''}`} onClick={() => toggle(x, i)} aria-label={x.done ? 'Desmarcar serie' : 'Marcar serie como hecha'}>
                {x.pr && x.done ? <Icon name="trophy" size={16} /> : <Icon name="check" size={18} stroke={3} />}
              </button>
            </div>
          );
        })}
      </div>
      <button className="add-set" onClick={addSet}><Icon name="plus" size={16} /> Añadir serie</button>
    </div>
  );
}

function detectPR(e, x, kg, reps, a, s, unit) {
  const st = exerciseStats(s.workouts, s.manualRMs, e.exId);
  if (!st.sessions.length || !(kg > 0)) return null;
  // mejores marcas incluyendo series ya hechas hoy
  let maxKg = st.maxKg, best1 = st.real1RM ? st.real1RM.kg : 0;
  a.exercises.filter(y => y.exId === e.exId).forEach(y => y.sets.forEach(z => {
    if (!z.done || z.uid === x.uid || z.type === 'W') return;
    const k = fromUnit(parseNum(z.kg) || 0, unit);
    if (k > maxKg) maxKg = k;
    if (Math.round(parseNum(z.reps)) === 1 && k > best1) best1 = k;
  }));
  const name = getExercise(e.exId, s).name;
  if (reps === 1 && kg > best1) { toast(`Nuevo 1RM · ${name} ${fmtNum(toUnit(kg, unit), 1)} ${unit}`, 'pr', 3500); vibrate([30, 60, 30]); return '1rm'; }
  if (kg > maxKg) { toast(`Récord de peso · ${name} ${fmtNum(toUnit(kg, unit), 1)} ${unit}`, 'pr', 3500); vibrate([30, 60, 30]); return 'peso'; }
  return null;
}

function RestBar({ a, now }) {
  if (!a.restEndsAt) return null;
  const left = Math.max(0, (a.restEndsAt - now) / 1000);
  const pct = a.restTotal ? Math.min(100, (1 - left / a.restTotal) * 100) : 0;
  const adj = d => upd(w => ({ ...w, restEndsAt: Math.max(Date.now() + 1000, w.restEndsAt + d * 1000), restTotal: Math.max(1, (w.restTotal || 0) + d) }));
  return (
    <div className="restbar">
      <div className="restbar-fill" style={{ width: `${pct}%` }} />
      <div className="restbar-in">
        <button className="rest-btn" onClick={() => adj(-15)}>−15</button>
        <div className="rest-mid"><span className="rest-k">Descanso</span><span className="rest-t">{fmtClock(left)}</span></div>
        <button className="rest-btn" onClick={() => adj(15)}>+15</button>
        <button className="rest-btn skip" onClick={() => upd(w => ({ ...w, restEndsAt: null }))}>Saltar</button>
      </div>
    </div>
  );
}

export function MiniWorkoutBar() {
  const a = useActive();
  const now = useNow(1000, !!a && a.minimized);
  if (!a || !a.minimized) return null;
  const left = a.restEndsAt ? Math.max(0, (a.restEndsAt - now) / 1000) : 0;
  return (
    <button className="minibar" onClick={() => setActive(x => ({ ...x, minimized: false }))}>
      <span className="pulse" />
      <div className="grow minw0">
        <div className="minibar-t ellipsis">{a.name}</div>
        <div className="minibar-s">{left > 0 ? `Descanso ${fmtClock(left)}` : 'Entreno en curso'}</div>
      </div>
      <span className="minibar-clock">{fmtClock((now - a.startedAt) / 1000)}</span>
      <Icon name="chevronU" size={20} />
    </button>
  );
}
