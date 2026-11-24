export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const todayISO = () => toISO(new Date());
export function parseISO(s) {
  const [y, m, d] = (s || todayISO()).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export const weekKey = iso => toISO(weekStart(parseISO(iso)));

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DAYS_S = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function fmtDate(iso, { weekday = false, year } = {}) {
  const d = parseISO(iso);
  const showYear = year ?? d.getFullYear() !== new Date().getFullYear();
  let s = `${d.getDate()} ${MONTHS_S[d.getMonth()]}${showYear ? ' ' + d.getFullYear() : ''}`;
  if (weekday) s = `${cap(DAYS[d.getDay()])}, ${s}`;
  return s;
}
export function relDate(iso) {
  const diff = Math.round((parseISO(todayISO()) - parseISO(iso)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff > 1 && diff < 7) return `Hace ${diff} días`;
  return fmtDate(iso);
}
export const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

export function fmtDuration(sec) {
  if (!sec && sec !== 0) return '—';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
// "60 kg × 8" o "PC × 8" si es peso corporal
export function fmtSet(kg, reps, unit, withUnit = true) {
  if (!(kg > 0)) return `PC × ${reps}`;
  return `${fmtNum(toUnit(kg, unit), 1)}${withUnit ? ' ' + unit : ''} × ${reps}`;
}
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtNum(n, dec = 0) {
  return Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: dec, minimumFractionDigits: 0, useGrouping: 'always' });
}
export function fmtCompact(n) {
  n = Number(n || 0);
  if (n >= 1e6) return fmtNum(n / 1e6, 1) + 'M';
  if (n >= 1e4) return fmtNum(n / 1e3, 0) + 'k';
  if (n >= 1e3) return fmtNum(n / 1e3, 1) + 'k';
  return fmtNum(n, 0);
}

export function parseNum(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

// Epley. Con 1 repetición es el propio peso.
export function e1rm(kg, reps) {
  if (!kg || !reps || reps < 1) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

export function roundTo(n, step = 0.5) { return Math.round(n / step) * step; }

// Escalas "bonitas" para ejes
export function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return n * p;
}

// Unidades: siempre se guarda en kg
export const LB = 2.20462;
export function toUnit(kg, unit) { return unit === 'lb' ? kg * LB : kg; }
export function fromUnit(v, unit) { return unit === 'lb' ? v / LB : v; }
export function fmtW(kg, unit, dec = 1) { return fmtNum(toUnit(kg, unit), dec); }

export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}
export function beep() {
  try {
    unlockAudio();
    if (!audioCtx) return;
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
    });
  } catch (e) {}
}

export function downloadFile(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function compressImage(file, max = 1080, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
