import React, { useMemo, useState } from 'react';
import { useStore, setState, getExercise } from '../store.js';
import { exerciseStats, isWork, bestSet } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Segmented, Chips, Stat, Section, Sheet, Empty, toast, confirmDialog, actionSheet } from '../ui.jsx';
import { TrendChart } from '../charts.jsx';
import { e1rm, fmtNum, fmtDate, toUnit, fromUnit, parseNum, todayISO, uid, relDate , fmtSet } from '../utils.js';
import { ExerciseForm } from './ExercisePicker.jsx';

export function ExerciseDetail({ id, onBack, onOpenWorkout }) {
  const s = useStore();
  const unit = s.settings.unit;
  const ex = getExercise(id, s);
  const st = useMemo(() => exerciseStats(s.workouts, s.manualRMs, id), [s.workouts, s.manualRMs, id]);
  const [tab, setTab] = useState('resumen');
  const [metric, setMetric] = useState('e1rm');
  const [rmOpen, setRmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const W = v => fmtNum(toUnit(v, unit), 1);

  const series = useMemo(() => st.sessions.slice(-40).map(({ w, ex: e }) => {
    const work = e.sets.filter(isWork);
    let v = 0;
    if (metric === 'e1rm') v = Math.max(0, ...work.map(x => e1rm(x.kg, x.reps)));
    else if (metric === 'max') v = Math.max(0, ...work.map(x => x.kg));
    else v = work.reduce((a, x) => a + x.kg * x.reps, 0);
    return { date: w.date, value: Math.round(toUnit(v, unit) * 10) / 10, w };
  }), [st, metric, unit]);

  const manual = s.manualRMs.filter(m => m.exId === id).sort((a, b) => b.date.localeCompare(a.date));

  const customMenu = async () => {
    const v = await actionSheet({ title: ex.name, items: [{ label: 'Editar ejercicio', icon: 'edit', value: 'edit' }, { label: 'Eliminar ejercicio', icon: 'trash', value: 'del', danger: true }] });
    if (v === 'edit') setEditOpen(true);
    if (v === 'del') {
      const used = st.sessions.length > 0 || s.routines.some(r => r.exercises.some(e => e.exId === id));
      if (used) return toast('No se puede eliminar: está en tu historial o en una rutina', 'error', 3500);
      if (await confirmDialog({ title: '¿Eliminar ejercicio?', confirm: 'Eliminar', danger: true })) {
        setState(x => ({ ...x, customExercises: x.customExercises.filter(c => c.id !== id) }));
        onBack();
      }
    }
  };

  return (
    <div className="page">
      <TopBar title={ex.name} sub={`${ex.muscle} · ${ex.equipment}`} onBack={onBack}
        right={ex.custom ? <button className="icon-btn" onClick={customMenu} aria-label="Opciones"><Icon name="more" size={22} /></button> : null} />
      <div className="page-body">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'resumen', label: 'Resumen' }, { value: 'historial', label: 'Historial' }, { value: 'records', label: 'Récords' }]} />

        {tab === 'resumen' && (
          st.sessions.length === 0 && !manual.length ? (
            <Empty icon="chart" title="Aún no hay datos" text="Cuando registres este ejercicio verás aquí tu progreso." action={<button className="btn btn-secondary mt12" onClick={() => setRmOpen(true)}>Añadir 1RM conocido</button>} />
          ) : (
            <>
              <div className="stat-grid mt16">
                <Stat label="1RM estimado" value={st.bestE1rm ? W(st.bestE1rm) : '—'} unit={st.bestE1rm ? unit : ''} sub={st.bestE1rmDate ? fmtDate(st.bestE1rmDate) : 'Fórmula de Epley'} accent />
                <Stat label="1RM real" value={st.real1RM ? W(st.real1RM.kg) : '—'} unit={st.real1RM ? unit : ''} sub={st.real1RM ? (st.real1RM.manual ? 'Registro manual' : fmtDate(st.real1RM.date)) : 'Sin series de 1 rep'} />
                <Stat label="Peso máximo" value={st.maxKg ? W(st.maxKg) : '—'} unit={st.maxKg ? unit : ''} sub={st.maxKgDate ? fmtDate(st.maxKgDate) : ''} />
                <Stat label="Sesiones" value={st.sessions.length} sub={st.lastDate ? `Última: ${relDate(st.lastDate).toLowerCase()}` : ''} />
              </div>
              <Section title="Progresión">
                <Chips scroll value={metric} onChange={setMetric} options={[{ value: 'e1rm', label: '1RM estimado' }, { value: 'max', label: 'Peso máximo' }, { value: 'vol', label: 'Volumen' }]} />
                <div className="card mt12">
                  <TrendChart data={series} xMode="date" fit={metric !== 'vol'} format={v => `${fmtNum(v, 1)} ${unit}`} axisFormat={v => fmtNum(v, 0)}
                    tooltip={d => `${fmtDate(d.date)} · ${d.w.name}`} emptyText="Necesitas al menos una sesión" />
                </div>
                {series.length >= 2 && (() => {
                  const d = series[series.length - 1].value - series[0].value;
                  return <div className="muted small mt8">{d >= 0 ? '+' : ''}{fmtNum(d, 1)} {unit} desde {fmtDate(series[0].date)}</div>;
                })()}
              </Section>
            </>
          )
        )}

        {tab === 'historial' && (
          st.sessions.length === 0 ? <Empty icon="history" title="Sin historial" text="Este ejercicio aún no aparece en ningún entreno." /> : (
            <div className="mt16">
              {[...st.sessions].reverse().map(({ w, ex: e }) => {
                const b = bestSet(e.sets);
                let n = 0;
                return (
                  <button key={w.id} className="card card-btn mb10" onClick={() => onOpenWorkout && onOpenWorkout(w.id)}>
                    <div className="row-between">
                      <div><div className="row-title">{w.name}</div><div className="row-sub">{fmtDate(w.date, { weekday: true })}</div></div>
                      {b && <span className="pill">1RM est. {W(e1rm(b.kg, b.reps))}</span>}
                    </div>
                    <div className="set-lines">
                      {e.sets.map((x, i) => (
                        <div key={i} className="set-line">
                          <span className={`set-dot t-${x.type || 'N'}`}>{x.type === 'W' ? 'C' : ++n}</span>
                          <span className="tnum">{fmtSet(x.kg, x.reps, unit)}</span>
                          {x.rir !== null && x.rir !== undefined && <span className="muted small">RIR {x.rir}</span>}
                        </div>
                      ))}
                    </div>
                    {e.notes && <div className="ex-note mt8">{e.notes}</div>}
                  </button>
                );
              })}
            </div>
          )
        )}

        {tab === 'records' && (
          <>
            <Section title="1RM real" action={<button className="text-btn" onClick={() => setRmOpen(true)}><Icon name="plus" size={16} /> Añadir</button>}>
              <div className="card">
                <div className="big-number">{st.real1RM ? <>{W(st.real1RM.kg)}<span className="unit"> {unit}</span></> : '—'}</div>
                <div className="muted small">{st.real1RM ? `${st.real1RM.manual ? 'Registro manual' : 'Serie de 1 repetición'} · ${fmtDate(st.real1RM.date)}` : 'Registra una serie de 1 repetición o añade tu 1RM conocido.'}</div>
                {manual.length > 0 && (
                  <div className="mt12">
                    <div className="list-label nopad">Registros manuales</div>
                    {manual.map(m => (
                      <div key={m.id} className="row-between row-line">
                        <span className="tnum">{W(m.kg)} {unit} <span className="muted small">· {fmtDate(m.date)}</span></span>
                        <button className="icon-btn sm" aria-label="Eliminar" onClick={async () => {
                          if (await confirmDialog({ title: '¿Eliminar este 1RM?', confirm: 'Eliminar', danger: true })) setState(x => ({ ...x, manualRMs: x.manualRMs.filter(y => y.id !== m.id) }));
                        }}><Icon name="trash" size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
            <Section title="Mejor peso por repeticiones">
              <div className="card nopad">
                <div className="rm-table">
                  <div className="rm-row head"><span>Reps</span><span>Peso</span><span>1RM est.</span><span>Fecha</span></div>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(r => {
                    const m = st.repMax[r];
                    return (
                      <div key={r} className={`rm-row ${m ? '' : 'dim'}`}>
                        <span>{r}</span>
                        <span className="tnum strong">{m ? `${W(m.kg)} ${unit}` : '—'}</span>
                        <span className="tnum muted">{m ? W(e1rm(m.kg, m.manual ? 1 : m.reps)) : ''}</span>
                        <span className="muted small">{m ? fmtDate(m.date) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="muted small mt8">Mayor peso levantado haciendo al menos ese número de repeticiones.</div>
            </Section>
          </>
        )}
        <div style={{ height: 40 }} />
      </div>
      <ManualRMSheet open={rmOpen} onClose={() => setRmOpen(false)} exId={id} unit={unit} />
      <ExerciseForm open={editOpen} editing={ex.custom ? ex : null} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
    </div>
  );
}

export function ManualRMSheet({ open, onClose, exId, unit, pickExercise }) {
  const [kg, setKg] = useState('');
  const [date, setDate] = useState(todayISO());
  React.useEffect(() => { if (open) { setKg(''); setDate(todayISO()); } }, [open]);
  const save = () => {
    const v = parseNum(kg);
    if (!(v > 0)) return toast('Introduce un peso válido', 'error');
    setState(x => ({ ...x, manualRMs: [...x.manualRMs, { id: uid('m_'), exId, kg: fromUnit(v, unit), date }] }));
    toast('1RM guardado');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Añadir 1RM">
      <div className="form">
        {pickExercise}
        <div className="grid2">
          <label className="field"><span>Peso ({unit})</span><input className="input" inputMode="decimal" value={kg} onChange={e => setKg(e.target.value)} placeholder="100" autoFocus /></label>
          <label className="field"><span>Fecha</span><input className="input" type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} /></label>
        </div>
        <div className="muted small">Si más adelante levantas más en una serie de 1 repetición, tu 1RM se actualiza solo.</div>
        <button className="btn btn-primary btn-block" onClick={save} disabled={!exId}>Guardar</button>
      </div>
    </Sheet>
  );
}
