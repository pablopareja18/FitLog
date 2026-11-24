import React, { useMemo, useState } from 'react';
import { LIBRARY, MUSCLES, EQUIPMENT, matchesQuery, norm } from '../exercises.js';
import { useStore, setState, getExercise } from '../store.js';
import { sortedWorkouts } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Sheet, toast } from '../ui.jsx';
import { uid } from '../utils.js';

export function allExercises(s) {
  return [...LIBRARY, ...(s.customExercises || [])].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function useExerciseUsage(s) {
  return useMemo(() => {
    const count = {}, last = {};
    sortedWorkouts(s.workouts).forEach(w => w.exercises.forEach(e => { count[e.exId] = (count[e.exId] || 0) + 1; last[e.exId] = w.date; }));
    return { count, last };
  }, [s.workouts]);
}

export function ExerciseList({ items, usage, selected, onTap, showCount = true }) {
  return (
    <div className="list">
      {items.map(ex => {
        const on = selected && selected.includes(ex.id);
        const n = usage.count[ex.id] || 0;
        return (
          <button key={ex.id} className={`row ex-row ${on ? 'row-on' : ''}`} onClick={() => onTap(ex)}>
            <div className="ex-avatar">{ex.name.slice(0, 1)}</div>
            <div className="grow minw0">
              <div className="row-title ellipsis">{ex.name}{ex.custom && <span className="tag">Propio</span>}</div>
              <div className="row-sub">{ex.muscle} · {ex.equipment}{showCount && n > 0 ? ` · ${n} ${n === 1 ? 'vez' : 'veces'}` : ''}</div>
            </div>
            {selected ? (
              <div className={`check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={16} stroke={3} />}</div>
            ) : <Icon name="chevronR" size={18} className="muted" />}
          </button>
        );
      })}
    </div>
  );
}

export function ExerciseFilters({ q, setQ, muscle, setMuscle, equip, setEquip }) {
  const [eqOpen, setEqOpen] = useState(false);
  return (
    <div className="filters">
      <div className="search">
        <Icon name="search" size={18} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" />
        {q && <button className="icon-btn sm" onClick={() => setQ('')} aria-label="Borrar"><Icon name="x" size={16} /></button>}
      </div>
      <div className="chips scroll-x">
        <button className={`chip ${equip ? 'on' : ''}`} onClick={() => setEqOpen(true)}>
          {equip || 'Material'} <Icon name="chevronD" size={14} />
        </button>
        <button className={`chip ${!muscle ? 'on' : ''}`} onClick={() => setMuscle('')}>Todos</button>
        {MUSCLES.filter(m => m !== 'Otro').map(m => (
          <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} onClick={() => setMuscle(muscle === m ? '' : m)}>{m}</button>
        ))}
      </div>
      <Sheet open={eqOpen} onClose={() => setEqOpen(false)} title="Material" compact>
        <div className="action-list">
          {['', ...EQUIPMENT].map(e => (
            <button key={e || 'all'} className={`action-item ${equip === e ? 'active' : ''}`} onClick={() => { setEquip(e); setEqOpen(false); }}>
              <span className="grow">{e || 'Todo el material'}</span>{equip === e && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

export function useFilteredExercises(s, q, muscle, equip) {
  return useMemo(() => allExercises(s).filter(ex =>
    (!muscle || ex.muscle === muscle) && (!equip || ex.equipment === equip) && matchesQuery(ex, q)
  ), [s.customExercises, q, muscle, equip]);
}

// Selector de ejercicios a pantalla completa. single = para reemplazar
export function ExercisePicker({ onClose, onDone, single = false, title }) {
  const s = useStore();
  const usage = useExerciseUsage(s);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equip, setEquip] = useState('');
  const [sel, setSel] = useState([]);
  const [creating, setCreating] = useState(false);
  const items = useFilteredExercises(s, q, muscle, equip);
  const recent = useMemo(() => Object.entries(usage.last).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 6).map(([id]) => getExercise(id, s)).filter(e => !e.missing), [usage, s]);
  const filtering = q || muscle || equip;

  const tap = ex => {
    if (single) { onDone([ex.id]); return; }
    setSel(v => v.includes(ex.id) ? v.filter(x => x !== ex.id) : [...v, ex.id]);
  };

  return (
    <div className="overlay-page">
      <TopBar title={title || (single ? 'Reemplazar ejercicio' : 'Añadir ejercicios')} onBack={onClose}
        right={<button className="text-btn" onClick={() => setCreating(true)}>Crear</button>} />
      <div className="page-body pb-cta">
        <ExerciseFilters {...{ q, setQ, muscle, setMuscle, equip, setEquip }} />
        {!filtering && recent.length > 0 && (
          <>
            <div className="list-label">Recientes</div>
            <ExerciseList items={recent} usage={usage} selected={single ? null : sel} onTap={tap} />
            <div className="list-label">Todos los ejercicios</div>
          </>
        )}
        {items.length ? <ExerciseList items={items} usage={usage} selected={single ? null : sel} onTap={tap} /> : (
          <div className="empty-inline">
            No hay resultados{q ? ` para “${q}”` : ''}.
            <button className="btn btn-secondary mt12" onClick={() => setCreating(true)}><Icon name="plus" size={18} /> Crear “{q || 'nuevo ejercicio'}”</button>
          </div>
        )}
      </div>
      {!single && (
        <div className="cta-bar">
          <button className="btn btn-primary btn-block" disabled={!sel.length} onClick={() => onDone(sel)}>
            {sel.length ? `Añadir ${sel.length} ${sel.length === 1 ? 'ejercicio' : 'ejercicios'}` : 'Selecciona ejercicios'}
          </button>
        </div>
      )}
      <ExerciseForm open={creating} initialName={q} onClose={() => setCreating(false)} onSaved={ex => {
        setCreating(false);
        if (single) onDone([ex.id]); else setSel(v => [...v, ex.id]);
      }} />
    </div>
  );
}

export function ExerciseForm({ open, onClose, onSaved, initialName = '', editing }) {
  const s = useStore();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('Pecho');
  const [equip, setEquip] = useState('Barra');
  React.useEffect(() => {
    if (open) { setName(editing?.name || initialName || ''); setMuscle(editing?.muscle || 'Pecho'); setEquip(editing?.equipment || 'Barra'); }
  }, [open]);
  const save = () => {
    const n = name.trim();
    if (!n) return toast('Escribe un nombre', 'error');
    const clash = allExercises(s).find(e => norm(e.name) === norm(n) && e.id !== editing?.id);
    if (clash) return toast('Ya existe un ejercicio con ese nombre', 'error');
    if (editing) {
      const ex = { ...editing, name: n, muscle, equipment: equip };
      setState(st => ({ ...st, customExercises: st.customExercises.map(e => e.id === ex.id ? ex : e) }));
      onSaved && onSaved(ex);
    } else {
      const ex = { id: uid('c_'), name: n, muscle, equipment: equip, custom: true };
      setState(st => ({ ...st, customExercises: [...st.customExercises, ex] }));
      toast('Ejercicio creado');
      onSaved && onSaved(ex);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
      <div className="form">
        <label className="field"><span>Nombre</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Press en máquina convergente" autoFocus />
        </label>
        <div className="field"><span>Músculo principal</span>
          <div className="chips wrap">{MUSCLES.map(m => <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} onClick={() => setMuscle(m)}>{m}</button>)}</div>
        </div>
        <div className="field"><span>Material</span>
          <div className="chips wrap">{EQUIPMENT.map(m => <button key={m} className={`chip ${equip === m ? 'on' : ''}`} onClick={() => setEquip(m)}>{m}</button>)}</div>
        </div>
        <button className="btn btn-primary btn-block" onClick={save}>{editing ? 'Guardar cambios' : 'Crear ejercicio'}</button>
      </div>
    </Sheet>
  );
}
