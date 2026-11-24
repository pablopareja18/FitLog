import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { niceMax, MONTHS_S, parseISO, fmtDate } from './utils.js';

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(320);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setW(el.clientWidth || 320);
    const ro = new ResizeObserver(() => setW(el.clientWidth || 320));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Gráfica de línea con área (estilo Strava) o barras. Eje Y a la derecha, un solo eje.
export function TrendChart({ data, height = 170, type = 'area', fit = false, format = v => v, axisFormat, tooltip, xMode = 'month', emptyText = 'Sin datos todavía' }) {
  const [ref, W] = useWidth();
  const [sel, setSel] = useState(null);
  useEffect(() => setSel(null), [data.length, type]);
  const n = data.length;
  const has = data.some(d => d.value > 0);
  const padL = 6, padR = 46, padT = 14, padB = 24;
  const pw = Math.max(10, W - padL - padR), ph = height - padT - padB;
  const vals = data.map(d => d.value);
  let min = 0, max = niceMax(Math.max(...vals, 0));
  if (fit && type === 'area' && vals.length) {
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.25, hi * 0.02, 1);
    const step = niceMax((hi - lo + 2 * pad) / 4) / 2 || 1;
    min = Math.max(0, Math.floor((lo - pad) / step) * step);
    max = Math.ceil((hi + pad) / step) * step;
  }
  const y = v => padT + ph - ((v - min) / (max - min || 1)) * ph;
  const band = pw / Math.max(n, 1);
  const x = i => type === 'bar' ? padL + band * i + band / 2 : padL + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
  const idx = sel ?? n - 1;
  const fmtAxis = axisFormat || format;

  const pick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
    setSel(best);
  };

  // Etiquetas del eje X
  const labels = [];
  if (xMode === 'month') {
    let prevM = null, lastX = -99;
    data.forEach((d, i) => {
      const dt = parseISO(d.date);
      const m = dt.getMonth();
      if (m !== prevM) {
        const lx = x(i);
        if (lx - lastX > 30 && lx < padL + pw - 6) { labels.push({ x: lx, t: MONTHS_S[m].toUpperCase(), anchor: lx < padL + 16 ? 'start' : 'middle' }); lastX = lx; }
        prevM = m;
      }
    });
  } else if (n) {
    const picks = n <= 3 ? data.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
    [...new Set(picks)].forEach(i => labels.push({ x: x(i), t: fmtDate(data[i].date), anchor: i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }));
  }

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = n ? `${line} L${x(n - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z` : '';
  const cur = data[idx];
  const tipX = cur ? Math.min(Math.max(x(idx), 70), W - 70) : 0;

  return (
    <div className="chart" ref={ref}>
      {!has ? <div className="chart-empty" style={{ height }}>{emptyText}</div> : (
        <>
          <div className="chart-tip" style={{ left: tipX }}>
            <span className="chart-tip-v">{format(cur.value)}</span>
            <span className="chart-tip-l">{tooltip ? tooltip(cur, idx) : fmtDate(cur.date)}</span>
          </div>
          <svg width={W} height={height} className="chart-svg"
            onPointerDown={pick} onPointerMove={e => e.buttons && pick(e)} onTouchMove={pick}
            role="img" aria-label="Gráfica">
            <defs>
              <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[min, (min + max) / 2, max].map((t, i) => (
              <g key={i}>
                <line x1={padL} x2={padL + pw} y1={y(t)} y2={y(t)} className="grid" />
                <text x={padL + pw + 8} y={y(t) + 4} className="axis">{fmtAxis(t)}</text>
              </g>
            ))}
            {type === 'area' ? (
              <>
                <path d={area} fill="url(#gArea)" />
                <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                <line x1={x(idx)} x2={x(idx)} y1={padT} y2={y(min)} className="cross" />
                {n <= 26 && data.map((d, i) => i !== idx && (
                  <circle key={i} cx={x(i)} cy={y(d.value)} r="3.5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2" />
                ))}
                <circle cx={x(idx)} cy={y(cur.value)} r="9" fill="var(--accent)" opacity="0.22" />
                <circle cx={x(idx)} cy={y(cur.value)} r="5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
              </>
            ) : (
              data.map((d, i) => {
                const bw = Math.max(2, Math.min(band - 2, 28));
                const h = Math.max(d.value > 0 ? 3 : 0, y(0) - y(d.value));
                const bx = x(i) - bw / 2, by = y(0) - h;
                const r = Math.min(4, bw / 2, h);
                const p = h > 0 ? `M${bx},${y(0)} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - r} Q${bx + bw},${by} ${bx + bw},${by + r} V${y(0)} Z` : '';
                return <path key={i} d={p} fill={i === idx ? 'var(--accent)' : 'var(--accent-mute)'} />;
              })
            )}
            <line x1={padL} x2={padL + pw} y1={y(min)} y2={y(min)} className="baseline" />
            {labels.map((l, i) => <text key={i} x={l.x} y={height - 6} textAnchor={l.anchor || 'middle'} className="axis">{l.t}</text>)}
          </svg>
        </>
      )}
    </div>
  );
}

export function Sparkline({ values, height = 36 }) {
  const [ref, W] = useWidth();
  if (values.length < 2) return <div ref={ref} className="spark-empty" style={{ height, width: '100%' }} />;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const x = i => 2 + ((W - 4) * i) / (values.length - 1);
  const y = v => 4 + (height - 8) - ((v - min) / span) * (height - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <div ref={ref} style={{ height, width: '100%', minWidth: 0 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3.5" fill="var(--accent)" />
      </svg>
    </div>
  );
}

export function HBars({ rows, format = v => v, onRow }) {
  const max = Math.max(...rows.map(r => r[1]), 1);
  return (
    <div className="hbars">
      {rows.map(([label, v, sub]) => (
        <button key={label} className="hbar" onClick={onRow ? () => onRow(label) : undefined} disabled={!onRow}>
          <div className="hbar-top"><span className="hbar-label">{label}</span><span className="hbar-val">{format(v)}{sub && <span className="muted"> {sub}</span>}</span></div>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} /></div>
        </button>
      ))}
    </div>
  );
}

// Mapa de calor tipo GitHub: columnas = semanas, filas = días (L-D)
export function Heatmap({ weeks, counts, onDay }) {
  return (
    <div className="heat">
      <div className="heat-days">{['L', '', 'X', '', 'V', '', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((wk, c) => wk.map((iso, r) => {
          const n = iso ? counts[iso] || 0 : -1;
          return <button key={`${c}-${r}`} disabled={n < 0} title={iso || ''} onClick={() => iso && n > 0 && onDay && onDay(iso)}
            className={`heat-cell l${n < 0 ? 'x' : Math.min(n, 2)}`} style={{ gridColumn: c + 1, gridRow: r + 1 }} />;
        }))}
      </div>
    </div>
  );
}
