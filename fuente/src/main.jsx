import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore, useActive, setActive, getActive, getState, onSaveError } from './store.js';
import { Icon } from './icons.jsx';
import { OverlayHost, toast, useNow } from './ui.jsx';
import { beep, vibrate, uid } from './utils.js';
import { TrainTab, RoutineEditor, WorkoutSummary } from './screens/Train.jsx';
import { HistoryTab, WorkoutDetail } from './screens/History.jsx';
import { ProgressTab, ExercisesTab } from './screens/Progress.jsx';
import { ProfileTab, Onboarding } from './screens/Profile.jsx';
import { ExerciseDetail } from './screens/ExerciseDetail.jsx';
import { PlanWizard, PlanDetail } from './screens/Plan.jsx';
import { ActiveWorkout, MiniWorkoutBar } from './screens/ActiveWorkout.jsx';
import { syncProgram } from './coachProgram.js';
import './styles.css';

const TABS = [
  { id: 'train', label: 'Entrenar', icon: 'dumbbell' },
  { id: 'history', label: 'Historial', icon: 'history' },
  { id: 'exercises', label: 'Ejercicios', icon: 'list' },
  { id: 'progress', label: 'Progreso', icon: 'chart' },
  { id: 'profile', label: 'Perfil', icon: 'user' },
];

onSaveError.fn = () => toast('No queda espacio en el dispositivo. Borra algunas fotos o exporta una copia.', 'error', 5000);

function RestWatcher() {
  const a = useActive();
  const now = useNow(500, !!(a && a.restEndsAt));
  useEffect(() => {
    if (a && a.restEndsAt && now >= a.restEndsAt) {
      setActive(x => x ? { ...x, restEndsAt: null } : x);
      if (getState().settings.sound !== false) beep();
      vibrate([200, 100, 200]);
      toast('Descanso terminado', 'default', 2000);
    }
  }, [now]);
  return null;
}

function App() {
  const s = useStore();
  const a = useActive();
  const [tab, setTab] = useState('train');
  const [stack, setStack] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const sync = () => syncProgram().then(p => { if (p) toast(`Programa actualizado por tu entrenador${p.semana ? ` · ${p.semana}` : ''}`, 'default', 3500); });
    sync();
    const onVis = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const onPop = () => setStack(st => st.slice(0, -1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = {
    push: (name, props = {}) => { setStack(st => [...st, { name, props, key: uid() }]); history.pushState({ fitlog: true }, ''); },
    pop: () => history.back(),
    tab: t => { if (stack.length) history.go(-stack.length); setStack([]); setTab(t); window.scrollTo(0, 0); },
  };

  if (!s.onboardingDone) return <><Onboarding /><OverlayHost /></>;

  const renderPage = p => {
    const back = nav.pop;
    if (p.name === 'routine') return <RoutineEditor id={p.props.id} onBack={back} />;
    if (p.name === 'exercise') return <ExerciseDetail id={p.props.id} onBack={back} onOpenWorkout={id => nav.push('workout', { id })} />;
    if (p.name === 'workout') return <WorkoutDetail id={p.props.id} onBack={back} nav={nav} />;
    if (p.name === 'plan') return <PlanDetail onBack={back} nav={nav} onRedo={() => nav.push('planWizard')} />;
    if (p.name === 'planWizard') return <PlanWizard onClose={back} onCreated={() => { nav.tab('train'); }} />;
    return null;
  };

  const showWorkout = a && !a.minimized;

  return (
    <div className="app">
      <main className="tab-root" aria-hidden={stack.length > 0 || showWorkout}>
        {tab === 'train' && <TrainTab nav={nav} />}
        {tab === 'history' && <HistoryTab nav={nav} />}
        {tab === 'exercises' && <ExercisesTab nav={nav} />}
        {tab === 'progress' && <ProgressTab nav={nav} />}
        {tab === 'profile' && <ProfileTab nav={nav} />}
      </main>

      {stack.map((p, i) => <div key={p.key} className="layer" style={{ zIndex: 20 + i }}>{renderPage(p)}</div>)}

      <div className="bottom-dock">
        <MiniWorkoutBar />
        {stack.length === 0 && (
          <nav className="tabbar">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => nav.tab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                <Icon name={t.icon} size={23} stroke={tab === t.id ? 2.3 : 1.9} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {showWorkout && <div className="layer top"><ActiveWorkout onFinished={res => {
        if (res && res.editing) { toast('Cambios guardados'); return; }
        if (res) setSummary(res);
      }} /></div>}
      {summary && <div className="layer top"><WorkoutSummary result={summary} onClose={() => { setSummary(null); setTab('train'); }}
        onOpenWorkout={id => { setSummary(null); setTab('history'); setTimeout(() => nav.push('workout', { id }), 0); }} /></div>}
      <RestWatcher />
      <OverlayHost />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update && reg.update();
    }).catch(() => {});
  });
}
