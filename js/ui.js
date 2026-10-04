// Small DOM helpers: escaping, modals, toasts and celebrations.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const SPINE_COLORS = ['#7a2e2e', '#2f5a45', '#2b3f6b', '#7a5a2a', '#5a2f55', '#1f4f5a', '#8a3b1f', '#3d3d3d', '#6b6b2a', '#a0522d', '#4a3a7a', '#2e2e4f'];

export function stars(n, { input = false } = {}) {
  return `<span class="stars${input ? ' stars--input' : ''}" ${input ? 'role="radiogroup" aria-label="Rating"' : `aria-label="${n} out of 5 stars"`}>${[1, 2, 3, 4, 5]
    .map((i) =>
      input
        ? `<button type="button" class="star${i <= n ? ' on' : ''}" data-star="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">★</button>`
        : `<span class="star${i <= n ? ' on' : ''}">★</span>`
    )
    .join('')}</span>`;
}

export function bindStars(root, onChange) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-star]');
    if (!btn) return;
    const n = Number(btn.dataset.star);
    $$('[data-star]', root).forEach((s) => s.classList.toggle('on', Number(s.dataset.star) <= n));
    onChange(n);
  });
}

let modalStack = [];

export function openModal(html, { onMount, onClose, className = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.remove('open');
    modalStack = modalStack.filter((m) => m !== close);
    setTimeout(() => wrap.remove(), 220);
    onClose?.();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  modalStack.push(close);
  onMount?.(wrap.querySelector('.modal'), close);
  return close;
}

export const closeTopModal = () => {
  const top = modalStack[modalStack.length - 1];
  if (top) {
    top();
    return true;
  }
  return false;
};

export function confirmDialog(message, { ok = 'Yes', cancel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    openModal(
      `<p class="confirm-text">${esc(message)}</p>
       <div class="modal-actions">
         <button class="btn btn--ghost" data-close>${esc(cancel)}</button>
         <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-yes>${esc(ok)}</button>
       </div>`,
      {
        className: 'modal--small',
        onClose: () => resolve(result),
        onMount: (m, close) => {
          m.querySelector('[data-yes]').addEventListener('click', () => {
            result = true;
            close();
          });
        },
      }
    );
  });
}

export function toast(html, { icon = '', kind = '', ms = 3600 } = {}) {
  const host = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = `${icon ? `<span class="toast-icon">${icon}</span>` : ''}<span class="toast-body">${html}</span>`;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

export function celebrate({ count = 36, colors = ['#e8c77a', '#ff8a3a', '#ffd36a', '#c9a45c', '#fff1c9'] } = {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.createElement('div');
  host.className = 'sparks';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 160;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist - 60}px`);
    s.style.setProperty('--c', colors[i % colors.length]);
    s.style.animationDelay = `${Math.random() * 120}ms`;
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1600);
}

export const buzz = (ms = 12) => navigator.vibrate?.(ms);

export function autoGrow(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}
