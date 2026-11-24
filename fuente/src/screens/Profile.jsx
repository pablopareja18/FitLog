import React, { useRef, useState } from 'react';
import { useStore, setState, replaceState, getState, freshState } from '../store.js';
import { workoutVolume } from '../stats.js';
import { Icon } from '../icons.jsx';
import { TopBar, Section, Sheet, Segmented, toast, confirmDialog, promptDialog, actionSheet } from '../ui.jsx';
import { TrendChart } from '../charts.jsx';
import { fmtNum, fmtCompact, fmtDate, toUnit, fromUnit, parseNum, todayISO, uid, downloadFile, compressImage, fmtClock } from '../utils.js';
import { migrateV2 } from '../store.js';

export const APP_VERSION = '3.0';

function Toggle({ on, onChange, label, sub }) {
  return (
    <button className="setting" onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <div className="grow text-left"><div className="row-title">{label}</div>{sub && <div className="row-sub">{sub}</div>}</div>
      <span className={`switch ${on ? 'on' : ''}`}><span /></span>
    </button>
  );
}

export function ProfileTab() {
  const s = useStore();
  const unit = s.settings.unit;
  const [wOpen, setWOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const totalVol = s.workouts.reduce((a, w) => a + workoutVolume(w), 0);
  const body = [...s.bodyLog].sort((a, b) => a.date.localeCompare(b.date));
  const lastW = body[body.length - 1];
  const photos = [...s.photos].sort((a, b) => b.date.localeCompare(a.date));
  const set = patch => setState(x => ({ ...x, settings: { ...x.settings, ...patch } }));

  const editName = async () => {
    const n = await promptDialog({ title: 'Tu nombre', defaultValue: s.settings.name, confirm: 'Guardar' });
    if (n !== null) set({ name: n.trim() });
  };

  const addPhoto = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const url = await compressImage(f);
      setState(x => ({ ...x, photos: [...x.photos, { id: uid('p_'), date: todayISO(), url }] }));
      toast('Foto guardada');
    } catch (err) { toast('No se pudo cargar la foto', 'error'); }
  };

  const exportData = () => {
    const data = { app: 'FitLog', exportedAt: new Date().toISOString(), ...getState() };
    downloadFile(`fitlog-copia-${todayISO()}.json`, JSON.stringify(data));
    toast('Copia descargada');
  };

  const importData = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      let next = null;
      if (data.version === 3 && Array.isArray(data.workouts)) next = data;
      else if (Array.isArray(data.sessions) || Array.isArray(data.routines)) next = migrateV2(data);
      if (!next) throw new Error('formato');
      const ok = await confirmDialog({ title: 'Importar copia', message: `Se reemplazarán tus datos actuales por la copia (${(next.workouts || []).length} entrenos, ${(next.routines || []).length} rutinas).`, confirm: 'Importar', danger: true });
      if (!ok) return;
      delete next.app; delete next.exportedAt;
      replaceState({ ...next, onboardingDone: true });
      toast('Copia importada');
    } catch (err) { toast('El archivo no es una copia válida de FitLog', 'error', 3500); }
  };

  const forceUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
    } catch (e) {}
    location.reload();
  };

  const resetAll = async () => {
    if (!(await confirmDialog({ title: '¿Borrar todos los datos?', message: 'Se eliminarán rutinas, entrenos, récords, peso y fotos de este dispositivo. Te recomendamos exportar una copia antes.', confirm: 'Continuar', danger: true }))) return;
    const t = await promptDialog({ title: 'Confirma escribiendo BORRAR', placeholder: 'BORRAR', confirm: 'Borrar todo' });
    if ((t || '').trim().toUpperCase() !== 'BORRAR') return;
    replaceState({ ...freshState(), onboardingDone: true, settings: s.settings });
    toast('Datos borrados');
  };

  return (
    <div className="page">
      <TopBar title="Perfil" large />
      <div className="page-body">
        <button className="card card-btn profile-card" onClick={editName}>
          <div className="avatar">{(s.settings.name || 'F').slice(0, 1).toUpperCase()}</div>
          <div className="grow minw0 text-left">
            <div className="profile-name">{s.settings.name || 'Añade tu nombre'}</div>
            <div className="row-sub">Desde {fmtDate(s.createdAt, { year: true })}</div>
          </div>
          <Icon name="edit" size={18} className="muted" />
        </button>
        <div className="stat-row mt12">
          <div><div className="ws-v">{s.workouts.length}</div><div className="ws-k">entrenos</div></div>
          <div><div className="ws-v">{fmtCompact(toUnit(totalVol, unit))}</div><div className="ws-k">{unit} totales</div></div>
          <div><div className="ws-v">{s.routines.length}</div><div className="ws-k">rutinas</div></div>
        </div>

        <Section title="Peso corporal" action={<button className="text-btn" onClick={() => setWOpen(true)}><Icon name="plus" size={16} /> Registrar</button>}>
          <div className="card">
            {lastW ? (
              <>
                <div className="row-between">
                  <div><div className="big-number">{fmtNum(toUnit(lastW.weight, unit), 1)}<span className="unit"> {unit}</span></div><div className="muted small">{fmtDate(lastW.date)}</div></div>
                  {body.length >= 2 && (() => { const d = lastW.weight - body[0].weight; return <span className="pill">{d >= 0 ? '+' : ''}{fmtNum(toUnit(d, unit), 1)} {unit} desde {fmtDate(body[0].date)}</span>; })()}
                </div>
                {body.length >= 2 && <div className="mt12"><TrendChart data={body.slice(-30).map(b => ({ date: b.date, value: Math.round(toUnit(b.weight, unit) * 10) / 10 }))} xMode="date" fit height={140} format={v => `${fmtNum(v, 1)} ${unit}`} axisFormat={v => fmtNum(v, 0)} /></div>}
                <div className="mt8">
                  {[...body].reverse().slice(0, 4).map(b => (
                    <div key={b.date} className="row-between row-line">
                      <span className="tnum">{fmtNum(toUnit(b.weight, unit), 1)} {unit}</span>
                      <span className="row-gap"><span className="muted small">{fmtDate(b.date)}</span>
                        <button className="icon-btn sm" aria-label="Eliminar" onClick={async () => { if (await confirmDialog({ title: '¿Eliminar registro?', confirm: 'Eliminar', danger: true })) setState(x => ({ ...x, bodyLog: x.bodyLog.filter(y => y.date !== b.date) })); }}><Icon name="trash" size={15} /></button></span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="muted small">Registra tu peso para ver su evolución.</div>}
          </div>
        </Section>

        <Section title="Fotos de progreso" action={<button className="text-btn" onClick={() => fileRef.current.click()}><Icon name="camera" size={16} /> Añadir</button>}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
          {photos.length === 0 ? <div className="card muted small">Tus fotos se guardan solo en este dispositivo.</div> : (
            <div className="photo-grid">
              {photos.map(p => (
                <button key={p.id} className="photo" onClick={() => setPhoto(p)}>
                  <img src={p.url} alt={`Foto del ${fmtDate(p.date)}`} loading="lazy" />
                  <span>{fmtDate(p.date)}</span>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="Ajustes">
          <div className="card nopad settings">
            <div className="setting">
              <div className="grow"><div className="row-title">Unidad de peso</div></div>
              <Segmented small value={unit} onChange={v => set({ unit: v })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
            </div>
            <button className="setting" onClick={async () => {
              const v = await actionSheet({ title: 'Descanso por defecto', items: [60, 90, 120, 150, 180, 240].map(o => ({ label: fmtClock(o), value: String(o), active: o === s.settings.defaultRest })) });
              if (v) set({ defaultRest: Number(v) });
            }}>
              <div className="grow text-left"><div className="row-title">Descanso por defecto</div><div className="row-sub">Para ejercicios nuevos</div></div>
              <span className="muted tnum">{fmtClock(s.settings.defaultRest)}</span><Icon name="chevronR" size={16} className="muted" />
            </button>
            <Toggle label="Columna RIR" sub="Repeticiones en reserva en cada serie" on={s.settings.showRir !== false} onChange={v => set({ showRir: v })} />
            <Toggle label="Sonido al terminar el descanso" on={s.settings.sound !== false} onChange={v => set({ sound: v })} />
          </div>
        </Section>

        <Section title="Tus datos">
          <div className="card nopad settings">
            <button className="setting" onClick={exportData}><Icon name="download" size={20} /><div className="grow text-left"><div className="row-title">Exportar copia de seguridad</div><div className="row-sub">Descarga un archivo con todos tus datos</div></div></button>
            <button className="setting" onClick={() => importRef.current.click()}><Icon name="upload" size={20} /><div className="grow text-left"><div className="row-title">Importar copia</div><div className="row-sub">Recupera tus datos en otro móvil</div></div></button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importData} />
            <button className="setting" onClick={forceUpdate}><Icon name="refresh" size={20} /><div className="grow text-left"><div className="row-title">Buscar actualización</div><div className="row-sub">Tus datos no se pierden</div></div></button>
          </div>
          <div className="banner mt12">
            <Icon name="info" size={20} />
            <div className="grow"><div className="banner-t">Tus datos están en este móvil</div>
              <div className="banner-s">Exporta una copia de vez en cuando por si cambias de móvil.</div></div>
          </div>
          <button className="btn btn-ghost-danger btn-block mt16" onClick={resetAll}>Borrar todos los datos</button>
          <div className="muted small center mt12">FitLog {APP_VERSION}</div>
        </Section>
        <div style={{ height: 24 }} />
      </div>

      <WeightSheet open={wOpen} onClose={() => setWOpen(false)} unit={unit} last={lastW} />
      <Sheet open={!!photo} onClose={() => setPhoto(null)} title={photo ? fmtDate(photo.date, { weekday: true, year: true }) : ''}>
        {photo && <>
          <img className="photo-full" src={photo.url} alt="" />
          <button className="btn btn-ghost-danger btn-block mt12" onClick={async () => {
            if (await confirmDialog({ title: '¿Eliminar foto?', confirm: 'Eliminar', danger: true })) { setState(x => ({ ...x, photos: x.photos.filter(p => p.id !== photo.id) })); setPhoto(null); }
          }}>Eliminar foto</button>
        </>}
      </Sheet>
    </div>
  );
}

function WeightSheet({ open, onClose, unit, last }) {
  const [v, setV] = useState('');
  const [date, setDate] = useState(todayISO());
  React.useEffect(() => { if (open) { setV(last ? String(fmtNum(toUnit(last.weight, unit), 1)).replace(/\./g, '') : ''); setDate(todayISO()); } }, [open]);
  const save = () => {
    const n = parseNum(v);
    if (!(n > 20 && n < 700)) return toast('Introduce un peso válido', 'error');
    setState(x => ({ ...x, bodyLog: [...x.bodyLog.filter(b => b.date !== date), { date, weight: Math.round(fromUnit(n, unit) * 10) / 10 }] }));
    toast('Peso registrado');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <div className="form">
        <div className="grid2">
          <label className="field"><span>Peso ({unit})</span><input className="input" inputMode="decimal" value={v} onChange={e => setV(e.target.value)} autoFocus /></label>
          <label className="field"><span>Fecha</span><input className="input" type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} /></label>
        </div>
        <button className="btn btn-primary btn-block" onClick={save}>Guardar</button>
      </div>
    </Sheet>
  );
}

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const slides = [
    { icon: 'dumbbell', t: 'Tu diario de gimnasio', d: 'Registra cada serie en segundos. FitLog recuerda lo que hiciste la última vez para que solo tengas que superarlo.' },
    { icon: 'chart', t: 'Progreso que se entiende', d: 'Volumen semanal, 1RM, récords, rachas y grupos musculares. Todo calculado solo.' },
    { icon: 'battery', t: 'Entrena con cabeza', d: 'Te avisa cuando toca semana de descarga (cada 4–6 semanas) y te propone los pesos adecuados.' },
  ];
  const finish = () => setState(x => ({ ...x, onboardingDone: true, settings: { ...x.settings, name: name.trim(), unit } }));
  const last = step === slides.length;
  return (
    <div className="onb">
      <div className="onb-dots">{[...slides, 0].map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
      {!last ? (
        <div className="onb-body" key={step}>
          <div className="onb-icon"><Icon name={slides[step].icon} size={40} /></div>
          <h1 className="onb-h">{slides[step].t}</h1>
          <p className="onb-p">{slides[step].d}</p>
          {step === 0 && (
            <div className="banner mt24">
              <Icon name="info" size={20} />
              <div className="grow"><div className="banner-t">Versión beta</div><div className="banner-s">Tus datos se guardan solo en este dispositivo. Nadie más los ve, pero si borras el navegador se pierden: puedes exportar copias desde Perfil.</div></div>
            </div>
          )}
        </div>
      ) : (
        <div className="onb-body" key="last">
          <h1 className="onb-h">Antes de empezar</h1>
          <label className="field mt24"><span>¿Cómo te llamas?</span><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Opcional" autoFocus /></label>
          <div className="field mt16"><span>Unidad de peso</span><Segmented value={unit} onChange={setUnit} options={[{ value: 'kg', label: 'Kilos (kg)' }, { value: 'lb', label: 'Libras (lb)' }]} /></div>
        </div>
      )}
      <div className="onb-cta">
        <button className="btn btn-primary btn-block btn-lg" onClick={() => last ? finish() : setStep(step + 1)}>{last ? 'Empezar a entrenar' : step === 0 ? 'Entendido, continuar' : 'Siguiente'}</button>
        {step > 0 && <button className="btn btn-ghost btn-block mt8" onClick={() => setStep(step - 1)}>Atrás</button>}
      </div>
    </div>
  );
}
