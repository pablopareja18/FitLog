import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from './icons.jsx';

// ---------- Mini store para overlays globales (toasts, diálogos, hojas de acciones)
let ov = { toasts: [], dialog: null, actions: null };
const ovL = new Set();
const ovSet = fn => { ov = fn(ov); ovL.forEach(l => l()); };
const useOv = () => useSyncExternalStore(cb => { ovL.add(cb); return () => ovL.delete(cb); }, () => ov);

export function toast(text, kind = 'default', ms = 1800) {
  const id = Math.random();
  ovSet(o => ({ ...o, toasts: [...o.toasts, { id, text, kind }] }));
  setTimeout(() => ovSet(o => ({ ...o, toasts: o.toasts.filter(t => t.id !== id) })), ms);
}

// confirmDialog({title, message, confirm, cancel, danger, options:[{label, value, danger}]}) -> Promise
export function confirmDialog(opts) {
  return new Promise(resolve => ovSet(o => ({ ...o, dialog: { ...opts, resolve } })));
}
export function promptDialog(opts) {
  return new Promise(resolve => ovSet(o => ({ ...o, dialog: { ...opts, prompt: true, resolve } })));
}
// actionSheet({title, items:[{label, icon, danger, value}]}) -> Promise(value|null)
export function actionSheet(opts) {
  return new Promise(resolve => ovSet(o => ({ ...o, actions: { ...opts, resolve } })));
}

export function OverlayHost() {
  const o = useOv();
  return (
    <>
      <div className="toasts">
        {o.toasts.map(t => <div key={t.id} className={`toast toast-${t.kind}`}>{t.kind === 'pr' && <Icon name="trophy" size={18} />}{t.text}</div>)}
      </div>
      {o.dialog && <Dialog d={o.dialog} close={v => { o.dialog.resolve(v); ovSet(x => ({ ...x, dialog: null })); }} />}
      {o.actions && (
        <Sheet open onClose={() => { o.actions.resolve(null); ovSet(x => ({ ...x, actions: null })); }} title={o.actions.title} compact>
          <div className="action-list">
            {o.actions.items.filter(Boolean).map((it, i) => (
              <button key={i} className={`action-item ${it.danger ? 'danger' : ''} ${it.active ? 'active' : ''}`}
                onClick={() => { o.actions.resolve(it.value); ovSet(x => ({ ...x, actions: null })); }}>
                {it.icon && <Icon name={it.icon} size={20} />}
                <span className="grow">{it.label}</span>
                {it.hint && <span className="muted small">{it.hint}</span>}
                {it.active && <Icon name="check" size={18} />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Dialog({ d, close }) {
  const [val, setVal] = useState(d.defaultValue || '');
  return (
    <div className="dialog-backdrop" onClick={() => close(d.prompt ? null : false)}>
      <div className="dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {d.title && <div className="dialog-title">{d.title}</div>}
        {d.message && <div className="dialog-msg">{d.message}</div>}
        {d.prompt && (
          <input className="input" autoFocus value={val} placeholder={d.placeholder || ''} inputMode={d.inputMode}
            onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && close(val)} />
        )}
        <div className="dialog-actions">
          {d.options ? d.options.map((op, i) => (
            <button key={i} className={`btn ${op.primary ? 'btn-primary' : op.danger ? 'btn-danger' : 'btn-ghost'}`} onClick={() => close(op.value)}>{op.label}</button>
          )) : (
            <>
              <button className="btn btn-ghost" onClick={() => close(d.prompt ? null : false)}>{d.cancel || 'Cancelar'}</button>
              <button className={`btn ${d.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(d.prompt ? val : true)}>{d.confirm || 'Aceptar'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children, compact, full }) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${compact ? 'sheet-compact' : ''} ${full ? 'sheet-full' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function TopBar({ title, onBack, right, sub, large }) {
  return (
    <header className={`topbar ${large ? 'topbar-large' : ''}`}>
      <div className="topbar-side">
        {onBack && <button className="icon-btn" onClick={onBack} aria-label="Atrás"><Icon name="chevronL" size={24} /></button>}
      </div>
      <div className="topbar-title">
        <div className="topbar-h">{title}</div>
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      <div className="topbar-side right">{right}</div>
    </header>
  );
}

export function Segmented({ options, value, onChange, small }) {
  return (
    <div className={`segmented ${small ? 'segmented-sm' : ''}`} role="tablist">
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, scroll }) {
  return (
    <div className={`chips ${scroll ? 'scroll-x' : ''}`}>
      {options.map(o => (
        <button key={o.value} className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Empty({ icon = 'dumbbell', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action}
    </div>
  );
}

export function Stat({ label, value, unit, sub, accent }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent ? 'accent' : ''}`}>{value}{unit && <span className="stat-unit"> {unit}</span>}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      {(title || action) && (
        <div className="section-head">
          <h2 className="section-title">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function useNow(ms = 1000, on = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, on]);
  return now;
}
