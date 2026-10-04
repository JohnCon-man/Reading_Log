import * as store from './store.js';
import { computeStats } from './stats.js';
import { ACHIEVEMENTS, earnedIds } from './achievements.js';
import { renderScene, fitScene } from './scene.js';
import { shelfView, currentView, bookView, statsView, settingsModal } from './views.js';
import { $, esc, toast, celebrate, closeTopModal } from './ui.js';

const sceneEl = $('#scene');
const viewEl = $('#view');
const topbar = $('#topbar');

/* ───────── Navigation (history-aware so the phone's back gesture works) ───────── */

function navigate(hash, { replace = false } = {}) {
  const st = history.state || { depth: 0 };
  if (replace) history.replaceState({ ...st }, '', hash);
  else history.pushState({ depth: (st.depth || 0) + 1, prev: location.hash || '#/' }, '', hash);
  route();
}

// The back button goes where its label says. Use real history when that's
// where it leads (so the phone's back gesture stays in sync), else replace.
function goBack(target) {
  const st = history.state || {};
  if (st.depth > 0 && st.prev === target) history.back();
  else navigate(target, { replace: true });
}

function parseRoute() {
  const [, name = '', id] = (location.hash.replace(/^#/, '') || '/').split('/');
  return { name, id };
}

function backTarget() {
  const { name, id } = parseRoute();
  if (name === 'book') {
    const book = store.getBook(id);
    if (book?.status === 'finished') return '#/shelf';
    const reading = store.getState().books.filter((b) => b.status === 'reading');
    return reading.length > 1 ? '#/current' : '#/';
  }
  return '#/';
}

const ctx = {
  navigate,
  refresh: () => renderView(true),
  afterChange,
  celebrate: () => celebrate(),
};

/* ───────── Rendering ───────── */

function drawScene() {
  const state = store.getState();
  const stats = computeStats(state);
  sceneEl.innerHTML = renderScene(state, stats);
  fitScene(sceneEl.firstElementChild);
  const goal = stats.goalDaily;
  $('#today-line').textContent = stats.pagesToday
    ? `${stats.pagesToday} of ${goal} pages today${stats.pagesToday >= goal ? ' ✓' : ''}`
    : stats.currentStreak
      ? 'Read today to keep your streak'
      : 'Tap around the room';
  $('#streak-num').textContent = stats.currentStreak;
  $('#streak-chip').classList.toggle('lit', stats.readToday);
  $('#streak-chip').setAttribute('aria-label', `${stats.currentStreak} day streak — open stats`);
}

let currentKey = '';

function renderView(keepScroll = false) {
  const { name, id } = parseRoute();
  const key = `${name}/${id || ''}`;
  const views = { shelf: shelfView, current: currentView, stats: statsView };
  let v = null;
  if (name === 'book' && id) v = bookView(ctx, id);
  else if (views[name]) v = views[name](ctx);

  document.body.classList.toggle('in-view', Boolean(v));
  if (!v) {
    if (viewEl.firstChild) {
      viewEl.firstElementChild.classList.add('leaving');
      setTimeout(() => {
        if (!document.body.classList.contains('in-view')) viewEl.innerHTML = '';
      }, 260);
    }
    currentKey = '';
    drawScene();
    return;
  }
  const scroller = $('.view-scroll', viewEl);
  const scroll = keepScroll && key === currentKey && scroller ? scroller.scrollTop : 0;
  const animate = key !== currentKey && !keepScroll;
  viewEl.innerHTML = v.html;
  const root = viewEl.firstElementChild;
  if (animate) root.classList.add('entering');
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'back') return goBack(backTarget());
    root.dispatchEvent(new CustomEvent(`action:${a.dataset.action}`, { detail: a }));
  });
  v.mount(root);
  const newScroller = $('.view-scroll', root);
  if (newScroller) newScroller.scrollTop = scroll;
  currentKey = key;
}

function route() {
  closeTopModal();
  renderView();
}

/* ───────── Gamification hooks ───────── */

function afterChange({ logged = false, silent = false } = {}) {
  const state = store.getState();
  const stats = computeStats(state);
  const earned = earnedIds(stats, state.unlocked);
  const fresh = earned.filter((id) => !state.unlocked[id]);
  if (fresh.length) store.markUnlocked(fresh);

  const levelUp = stats.level > (state.level || 1);
  if (stats.level !== state.level) store.setLevel(stats.level);

  if (!silent) {
    if (logged && stats.readToday) {
      const n = stats.currentStreak;
      if (stats.goalDaily && stats.pagesToday >= stats.goalDaily && lastPagesToday < stats.goalDaily) {
        toast(`Daily goal met — <b>${stats.pagesToday}</b> pages today`, { icon: '🎯' });
      }
      toast(n > 1 ? `<b>${n}-day streak!</b> The fire grows.` : 'Logged. The fire is lit.', { icon: '🔥' });
    }
    fresh.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      setTimeout(() => toast(`<small>Achievement unlocked</small><br><b>${esc(a.name)}</b> — ${esc(a.desc)}`, { icon: a.icon, kind: 'toast--gold', ms: 4500 }), 500 + i * 700);
    });
    if (fresh.length) setTimeout(() => celebrate({ count: 24 }), 500);
    if (levelUp) {
      setTimeout(() => {
        toast(`<small>Level up!</small><br>You're now <b>${esc(stats.levelTitle)}</b> (Lv ${stats.level})`, { icon: '⭐', kind: 'toast--gold', ms: 5000 });
        celebrate();
      }, 400 + fresh.length * 700);
    }
  }
  lastPagesToday = stats.pagesToday;
  drawScene();
}
let lastPagesToday = 0;

/* ───────── Wiring ───────── */

sceneEl.addEventListener('click', (e) => {
  const hot = e.target.closest('[data-go]');
  if (!hot) return;
  const go = hot.dataset.go;
  sceneEl.querySelectorAll(`[data-go="${go}"]`).forEach((g) => g.classList.add('tapped'));
  navigator.vibrate?.(8);
  setTimeout(() => {
    sceneEl.querySelectorAll('.tapped').forEach((g) => g.classList.remove('tapped'));
    if (go === 'current') {
      const reading = store.getState().books.filter((b) => b.status === 'reading');
      return navigate(reading.length === 1 ? `#/book/${reading[0].id}` : '#/current');
    }
    navigate(`#/${go}`);
  }, 160);
});
sceneEl.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-go]')) {
    e.preventDefault();
    e.target.closest('[data-go]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
});

$('#streak-chip').addEventListener('click', () => navigate('#/stats'));
$('#settings-btn').addEventListener('click', () => settingsModal(ctx));
$('#brand').addEventListener('click', () => navigate('#/', { replace: true }));

window.addEventListener('popstate', route);
window.addEventListener('hashchange', route);
window.addEventListener('resize', () => fitScene(sceneEl.firstElementChild));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !closeTopModal() && document.body.classList.contains('in-view')) goBack(backTarget());
});

// When the day rolls over (or you come back to the app), refresh the streak.
let lastDay = new Date().toDateString();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && new Date().toDateString() !== lastDay) {
    lastDay = new Date().toDateString();
    drawScene();
    renderView(true);
  }
});

if (!history.state) history.replaceState({ depth: 0 }, '', location.hash || '#/');
afterChange({ silent: true });
route();
topbar.classList.add('ready');
requestAnimationFrame(() => document.body.classList.add('loaded'));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
