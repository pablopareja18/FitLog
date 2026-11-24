import React, { useMemo, useState } from 'react';
import { useStore, getExercise } from '../store.js';
import { weeklySeries, workoutVolume, workoutSets, muscleSets, weekStreaks, oneRMRecords, exerciseStats, exerciseSessions, isWork, workoutsInRange } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Segmented, Chips, Section, Stat, Empty } from '../ui.jsx';
import { TrendChart, HBars, Sparkline, Heatmap } from '../charts.jsx';
import { fmtNum, fmtCompact, fmtDate, fmtDuration, toUnit, toISO, addDays, weekStart, todayISO, e1rm, relDate } from '../utils.js';
import { ExercisePicker, ExerciseFilters, ExerciseList, useFilteredExercises, useExerciseUsage, ExerciseForm } from './ExercisePicker.jsx';
import { ManualRMSheet } from './ExerciseDetail.jsx';

const RANGES = [{ value: 12, label: '3 meses' }, { value: 26, label: '6 meses' }, { value: 52, label: '1 año' }];
const METRICS = [
  { value: 'volume', label: 'Volumen', type: 'area' },
  { value: 'workouts', label: 'Entrenos', type: 'bar' },
  { value: 'sets', label: 'Series', type: 'bar' },
  { value: 'duration', label: 'Tiempo', type: 'area' },
];

function pct(a, b) { if (!b) return null; return Math.round(((a - b) / b) * 100); }
function Delta({ now, prev }) {
  const p = pct(now, prev);
  if (p === null) return <span className="muted">—</span>;
  return <span className={p >= 0 ? 'up' : 'down'}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}% vs periodo anterior</span>;
}

export function ProgressTab({ nav }) {
  const s = useStore();
  const unit = s.settings.unit;
  const [weeks, setWeeks] = useState(12);
  const [metric, setMetric] = useState('volume');
  const [maxTab, setMaxTab] = useState('e1rm');
  const [rmPick, setRmPick] = useState(false);
  const [rmEx, setRmEx] = useState(null);

  const from = toISO(addDays(weekStart(new Date()), -(weeks - 1) * 7));
  const prevFrom = toISO(addDays(weekStart(new Date()), -(2 * weeks - 1) * 7));
  const inRange = useMemo(() => workoutsInRange(s.workouts, from), [s.workouts, from]);
  const prevRange = useMemo(() => s.workouts.filter(w => w.date >= prevFrom && w.date < from), [s.workouts, from, prevFrom]);
  const sum = ws => ({ n: ws.length, vol: ws.reduce((a, w) => a + workoutVolume(w), 0), sets: ws.reduce((a, w) => a + workoutSets(w), 0), time: ws.reduce((a, w) => a + (w.duration || 0), 0) });
  const cur = sum(inRange), prev = sum(prevRange);

  const m = METRICS.find(x => x.value === metric);
  const series = useMemo(() => weeklySeries(s.workouts, weeks, metric).map(d => ({ ...d, value: metric === 'volume' ? Math.round(toUnit(d.value, unit)) : d.value })), [s.workouts, weeks, metric, unit]);
  const fmtMetric = v => metric === 'volume' ? `${fmtNum(v)} ${unit}` : metric === 'duration' ? fmtDuration(v * 60) : `${fmtNum(v)} ${metric === 'workouts' ? (v === 1 ? 'entreno' : 'entrenos') : 'series'}`;
  const axisMetric = v => metric === 'volume' ? fmtCompact(v) : metric === 'duration' ? `${fmtNum(v / 60, 1)}h` : fmtNum(v, 1);

  const streak = useMemo(() => weekStreaks(s.workouts, s.deloads), [s.workouts, s.deloads]);
  const heat = useMemo(() => {
    const cols = 17, start = addDays(weekStart(new Date()), -(cols - 1) * 7), today = todayISO();
    const counts = {};
    s.workouts.forEach(w => { counts[w.date] = (counts[w.date] || 0) + 1; });
    const grid = Array.from({ length: cols }, (_, c) => Array.from({ length: 7 }, (_, r) => { const d = toISO(addDays(start, c * 7 + r)); return d <= today ? d : null; }));
    return { grid, counts };
  }, [s.workouts]);

  const muscles = useMemo(() => muscleSets(inRange, id => getExercise(id, s)), [inRange, s.customExercises]);
  const records = useMemo(() => oneRMRecords(s.workouts, s.manualRMs), [s.workouts, s.manualRMs]);
  const exIds = useMemo(() => [...new Set(s.workouts.flatMap(w => w.exercises.map(e => e.exId)))], [s.workouts]);
  const stats = useMemo(() => Object.fromEntries([...new Set([...exIds, ...s.manualRMs.map(x => x.exId)])].map(id => [id, exerciseStats(s.workouts, s.manualRMs, id)])), [s.workouts, s.manualRMs, exIds]);

  const maxRows = useMemo(() => Object.entries(stats).map(([id, st]) => {
    const v = maxTab === 'e1rm' ? st.bestE1rm : (st.repMax[Number(maxTab)] || {}).kg || 0;
    return [id, v];
  }).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10), [stats, maxTab]);

  const topLifts = useMemo(() => Object.entries(stats).filter(([, st]) => st.sessions.length >= 2).sort((a, b) => b[1].sessions.length - a[1].sessions.length).slice(0, 4), [stats]);

  if (s.workouts.length === 0 && s.manualRMs.length === 0) {
    return (
      <div className="page"><TopBar title="Progreso" large />
        <div className="page-body"><Empty icon="chart" title="Tu progreso aparecerá aquí" text="Completa tu primer entreno para ver volumen, récords, rachas y mucho más." /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar title="Progreso" large />
      <div className="page-body">
        <Segmented value={weeks} onChange={setWeeks} options={RANGES} />

        <div className="stat-grid mt16">
          <Stat label="Entrenos" value={cur.n} sub={<Delta now={cur.n} prev={prev.n} />} />
          <Stat label="Volumen" value={fmtCompact(toUnit(cur.vol, unit))} unit={unit} sub={<Delta now={cur.vol} prev={prev.vol} />} />
          <Stat label="Series" value={fmtNum(cur.sets)} sub={<Delta now={cur.sets} prev={prev.sets} />} />
          <Stat label="Tiempo" value={cur.time >= 36000 ? fmtNum(cur.time / 3600, 1) : fmtDuration(cur.time)} unit={cur.time >= 36000 ? 'h' : ''} sub={<Delta now={cur.time} prev={prev.time} />} />
        </div>

        <Section title={`Últimas ${weeks} semanas`}>
          <Chips scroll value={metric} onChange={setMetric} options={METRICS} />
          <div className="card mt12">
            <TrendChart data={series} type={m.type} format={fmtMetric} axisFormat={axisMetric}
              tooltip={d => `Semana del ${fmtDate(d.date)}`} />
          </div>
        </Section>

        <Section title="Constancia">
          <div className="stat-grid three">
            <Stat label="Racha actual" value={streak.current} unit="sem" accent={streak.current >= 4} />
            <Stat label="Mejor racha" value={streak.best} unit="sem" />
            <Stat label="Media" value={fmtNum(cur.n / weeks, 1)} unit="/sem" />
          </div>
          <div className="card mt12">
            <Heatmap weeks={heat.grid} counts={heat.counts} />
            <div className="heat-legend"><span>Últimas 17 semanas</span><span className="grow" /><span className="heat-cell l0" /> <span className="heat-cell l1" /> <span className="heat-cell l2" /></div>
          </div>
        </Section>

        {muscles.length > 0 && (
          <Section title="Series por grupo muscular">
            <div className="card"><HBars rows={muscles} format={v => `${v} series`} /></div>
            <div className="muted small mt8">Series efectivas (sin calentamiento) en el periodo elegido.</div>
          </Section>
        )}

        <Section title="Récords de 1RM" action={<button className="text-btn" onClick={() => setRmPick(true)}><Icon name="plus" size={16} /> Añadir</button>}>
          {Object.keys(records.current).length === 0 ? (
            <div className="card muted small">Aquí aparecen tus 1RM reales: series de 1 repetición o los que añadas a mano. Las estimaciones no cuentan como récord.</div>
          ) : (
            <div className="card nopad">
              {Object.values(records.current).sort((a, b) => b.kg - a.kg).map(r => (
                <button key={r.exId} className="row" onClick={() => nav.push('exercise', { id: r.exId })}>
                  <div className="grow minw0">
                    <div className="row-title ellipsis">{getExercise(r.exId, s).name}</div>
                    <div className="row-sub">{fmtDate(r.date)} · {r.manual ? 'registro manual' : 'serie de 1 rep'}</div>
                  </div>
                  <span className="pill accent">{fmtNum(toUnit(r.kg, unit), 1)} {unit}</span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {maxRows.length > 0 || Object.keys(stats).length > 0 ? (
          <Section title="Máximos por ejercicio">
            <Segmented small value={maxTab} onChange={setMaxTab} options={[{ value: 'e1rm', label: '1RM' }, { value: '3', label: '3R' }, { value: '5', label: '5R' }, { value: '6', label: '6R' }]} />
            <div className="muted small mt8">{maxTab === 'e1rm' ? '1RM estimado (Epley) o real si es mayor.' : `Mayor peso levantado haciendo al menos ${maxTab} repeticiones.`}</div>
            <div className="card mt12">
              {maxRows.length ? <HBars rows={maxRows.map(([id, v]) => [getExercise(id, s).name, Math.round(toUnit(v, unit) * 10) / 10])} format={v => `${fmtNum(v, 1)} ${unit}`}
                onRow={name => { const id = maxRows.find(([i]) => getExercise(i, s).name === name)?.[0]; id && nav.push('exercise', { id }); }} />
                : <div className="muted small">Sin series de {maxTab} o más repeticiones todavía.</div>}
            </div>
          </Section>
        ) : null}

        {topLifts.length > 0 && (
          <Section title="Tus ejercicios principales">
            <div className="lift-grid">
              {topLifts.map(([id, st]) => {
                const vals = st.sessions.slice(-12).map(({ ex }) => Math.max(0, ...ex.sets.filter(isWork).map(x => e1rm(x.kg, x.reps))));
                const d = vals[vals.length - 1] - vals[0];
                return (
                  <button key={id} className="card card-btn lift" onClick={() => nav.push('exercise', { id })}>
                    <div className="lift-name ellipsis">{getExercise(id, s).name}</div>
                    <div className="lift-v">{fmtNum(toUnit(vals[vals.length - 1], unit), 0)}<span className="unit"> {unit}</span></div>
                    <div className={`lift-d ${d >= 0 ? 'up' : 'down'}`}>{d >= 0 ? '+' : ''}{fmtNum(toUnit(d, unit), 1)} {unit} · 1RM est.</div>
                    <Sparkline values={vals} />
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {s.bodyLog.length >= 2 && (
          <Section title="Peso corporal" action={<button className="text-btn" onClick={() => nav.tab('profile')}>Registrar <Icon name="chevronR" size={14} /></button>}>
            <div className="card">
              <TrendChart data={[...s.bodyLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(b => ({ date: b.date, value: Math.round(toUnit(b.weight, unit) * 10) / 10 }))}
                xMode="date" fit format={v => `${fmtNum(v, 1)} ${unit}`} axisFormat={v => fmtNum(v, 0)} />
            </div>
          </Section>
        )}
        <div style={{ height: 24 }} />
      </div>
      {rmPick && <ExercisePicker single title="1RM de qué ejercicio" onClose={() => setRmPick(false)} onDone={ids => { setRmPick(false); setRmEx(ids[0]); }} />}
      <ManualRMSheet open={!!rmEx} exId={rmEx} unit={unit} onClose={() => setRmEx(null)}
        pickExercise={rmEx && <div className="field"><span>Ejercicio</span><div className="row-title">{getExercise(rmEx, s).name}</div></div>} />
    </div>
  );
}

export function ExercisesTab({ nav }) {
  const s = useStore();
  const usage = useExerciseUsage(s);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equip, setEquip] = useState('');
  const [mine, setMine] = useState('all');
  const [creating, setCreating] = useState(false);
  let items = useFilteredExercises(s, q, muscle, equip);
  if (mine === 'mine') items = items.filter(e => usage.count[e.id] || e.custom).sort((a, b) => (usage.count[b.id] || 0) - (usage.count[a.id] || 0));
  return (
    <div className="page">
      <TopBar title="Ejercicios" large right={<button className="icon-btn" onClick={() => setCreating(true)} aria-label="Crear ejercicio"><Icon name="plus" size={24} /></button>} />
      <div className="page-body">
        <Segmented value={mine} onChange={setMine} options={[{ value: 'all', label: 'Todos' }, { value: 'mine', label: 'Mis ejercicios' }]} />
        <div className="mt12"><ExerciseFilters {...{ q, setQ, muscle, setMuscle, equip, setEquip }} /></div>
        <div className="list-label">{items.length} ejercicios</div>
        {items.length ? <ExerciseList items={items} usage={usage} onTap={ex => nav.push('exercise', { id: ex.id })} />
          : <div className="empty-inline">{mine === 'mine' ? 'Aún no has registrado ejercicios.' : 'Sin resultados.'}</div>}
        <div style={{ height: 24 }} />
      </div>
      <ExerciseForm open={creating} initialName={q} onClose={() => setCreating(false)} onSaved={ex => { setCreating(false); nav.push('exercise', { id: ex.id }); }} />
    </div>
  );
}
