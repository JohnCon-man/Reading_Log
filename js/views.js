// Every screen other than the study scene.
import * as store from './store.js';
import { computeStats, bookProgress, levelTitle } from './stats.js';
import { ACHIEVEMENTS } from './achievements.js';
import { todayStr, fmtLong, fmtDay, fmtFull, fmtShort, relativeDay, addDays, parseDate, yearOf, daysBetween } from './dates.js';
import { esc, $, $$, stars, bindStars, openModal, confirmDialog, toast, SPINE_COLORS, autoGrow, buzz } from './ui.js';

const num = (n) => Number(n || 0).toLocaleString();
const plural = (n, word, many = `${word}s`) => `${num(n)} ${n === 1 ? word : many}`;

function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function head(title, { right = '', back = 'Study' } = {}) {
  return `<header class="view-head">
    <button class="back-btn" data-action="back" aria-label="Back"><span aria-hidden="true">‹</span> ${esc(back)}</button>
    <h1>${title}</h1>
    <div class="head-right">${right}</div>
  </header>`;
}

/* ───────────────────────── Bookshelf ───────────────────────── */

let shelfYear = 'all';

function spine(book) {
  const h = hash(book.id + book.title);
  const pages = Number(book.totalPages) || 250;
  const width = Math.round(34 + Math.min(pages, 1000) / 1000 * 26);
  const height = 148 + (h % 34);
  const style = h % 4;
  const last = (book.author || '').trim().split(/\s+/).pop() || '';
  return `<button class="spine-slot" data-open="${book.id}" style="--w:${width}px;--h:${height}px;--c:${esc(book.color)}" aria-label="${esc(book.title)}${book.author ? ` by ${esc(book.author)}` : ''}">
    <span class="spine spine--s${style}">
      <span class="spine-title">${esc(book.title)}</span>
      ${last ? `<span class="spine-author">${esc(last)}</span>` : ''}
    </span>
  </button>`;
}

// Books added straight to the shelf this year with no reading sessions logged:
// likely older reads that picked up today's date by default.
function likelyOldReads(finished, today) {
  return finished.filter(
    (b) =>
      b.finishedAt &&
      !b.dateConfirmed &&
      yearOf(b.finishedAt) === yearOf(today) &&
      b.createdAt &&
      b.finishedAt === b.createdAt.slice(0, 10) &&
      !store.logsFor(b.id).length
  );
}

const byFinished = (a, b) => {
  if (!a.finishedAt !== !b.finishedAt) return a.finishedAt ? -1 : 1; // undated go last
  return (b.finishedAt || '').localeCompare(a.finishedAt || '') || (b.createdAt || '').localeCompare(a.createdAt || '');
};

export function shelfView(ctx) {
  const { books } = store.getState();
  const today = todayStr();
  const finished = books.filter((b) => b.status === 'finished').sort(byFinished);
  const years = [...new Set(finished.map((b) => b.finishedAt && yearOf(b.finishedAt)).filter(Boolean))].sort((a, b) => b - a);
  const undated = finished.filter((b) => !b.finishedAt);
  const filters = years.length + (undated.length ? 1 : 0);
  if (shelfYear === 'undated' ? !undated.length : shelfYear !== 'all' && !years.includes(shelfYear)) shelfYear = 'all';
  const shown =
    shelfYear === 'all'
      ? finished
      : shelfYear === 'undated'
        ? undated
        : finished.filter((b) => b.finishedAt && yearOf(b.finishedAt) === shelfYear);
  const pages = shown.reduce((s, b) => s + (Number(b.totalPages) || 0), 0);
  const rated = shown.filter((b) => b.rating);
  const avg = rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1) : null;
  const suspects = likelyOldReads(finished, today);

  const html = `<section class="view view--shelf">
    ${head('The Bookshelf', { right: `<button class="icon-btn" data-action="add-finished" aria-label="Add a book you've read">＋</button>` })}
    <div class="view-scroll">
      ${suspects.length ? `<div class="notice">
        <p><b>${plural(suspects.length, 'book')}</b> you added today ${suspects.length === 1 ? 'is' : 'are'} counting toward your ${yearOf(today)} goal. Older reads?</p>
        <div class="notice-actions">
          <button class="btn btn--gold" data-action="undate-suspects">Mark as older reads (no date)</button>
          <button class="btn btn--ghost-light" data-action="keep-suspects">No, I read ${suspects.length === 1 ? 'it' : 'them'} this year</button>
        </div>
      </div>` : ''}
      ${filters > 1 ? `<div class="chips" role="tablist">
        <button class="chip${shelfYear === 'all' ? ' on' : ''}" data-year="all">All</button>
        ${years.map((y) => `<button class="chip${shelfYear === y ? ' on' : ''}" data-year="${y}">${y}</button>`).join('')}
        ${undated.length ? `<button class="chip${shelfYear === 'undated' ? ' on' : ''}" data-year="undated">Earlier</button>` : ''}
      </div>` : ''}
      <p class="shelf-summary">${plural(shown.length, 'book')} · ${num(pages)} pages${avg ? ` · <span class="gold">★</span> ${avg} avg` : ''}${shelfYear === 'undated' ? '<br><small>Older reads, not counted toward any year</small>' : ''}</p>
      <div class="bookcase">
        <div class="shelf">
          ${shown.map(spine).join('')}
          <button class="spine-slot spine-slot--add" data-action="add-finished" style="--w:46px;--h:160px">
            <span class="spine spine--add"><span class="spine-title">＋ Add a book</span></span>
          </button>
        </div>
      </div>
      ${finished.length === 0 ? `<p class="empty-note">Your shelf is waiting for its first book.<br>Finish a current read, or add books you've already read with ＋.</p>` : ''}
    </div>
  </section>`;

  const mount = (root) => {
    root.addEventListener('click', (e) => {
      const y = e.target.closest('[data-year]');
      if (y) {
        const v = y.dataset.year;
        shelfYear = v === 'all' || v === 'undated' ? v : Number(v);
        ctx.refresh();
        return;
      }
      const s = e.target.closest('[data-open]');
      if (s) {
        s.classList.add('pulled');
        buzz(8);
        setTimeout(() => ctx.navigate(`#/book/${s.dataset.open}`), 220);
      }
    });
    root.addEventListener('action:add-finished', () => bookForm(ctx, { status: 'finished', finishedAt: null }));
    root.addEventListener('action:undate-suspects', () => {
      suspects.forEach((b) => store.updateBook(b.id, { finishedAt: null, startedAt: null, dateConfirmed: true }));
      ctx.afterChange();
      ctx.refresh();
      toast(`Moved to <b>Earlier</b> — they no longer count toward ${yearOf(today)}`, { icon: '📚' });
    });
    root.addEventListener('action:keep-suspects', () => {
      suspects.forEach((b) => store.updateBook(b.id, { dateConfirmed: true }));
      ctx.refresh();
    });
  };
  return { html, mount };
}

/* ───────────────────────── Current reads ───────────────────────── */

export function currentView(ctx) {
  const state = store.getState();
  const today = todayStr();
  const reading = state.books
    .filter((b) => b.status === 'reading')
    .map((b) => ({ b, p: bookProgress(b, state.logs) }))
    .sort((x, y) => (y.p.lastDate || y.b.startedAt || '').localeCompare(x.p.lastDate || x.b.startedAt || ''));
  const cards = reading
    .map(({ b, p }) => {
      const readToday = p.lastDate === today;
      return `<button class="read-card" data-open="${b.id}">
        <span class="mini-cover" style="--c:${esc(b.color)}"><span>${esc(b.title)}</span></span>
        <span class="read-card-body">
          <span class="read-card-title">${esc(b.title)}</span>
          ${b.author ? `<span class="read-card-author">${esc(b.author)}</span>` : ''}
          <span class="progress"><span style="width:${p.pct}%"></span></span>
          <span class="read-card-meta">p. ${num(p.currentPage)}${b.totalPages ? ` of ${num(b.totalPages)} · ${p.pct}%` : ''}</span>
          <span class="read-card-meta">${p.lastDate ? `Last read ${relativeDay(p.lastDate, today)}` : 'Not started yet'}${readToday ? ' <span class="tick">✓ read today</span>' : ''}</span>
        </span>
      </button>`;
    })
    .join('');

  const html = `<section class="view view--desk">
    ${head('On the Nightstand')}
    <div class="view-scroll">
      <div class="card-list">
        ${reading.length > 1 ? `<p class="list-note">${plural(reading.length, 'book')} in rotation · most recently read first</p>` : ''}
        ${cards || `<div class="paper paper--card empty-paper">
          <p class="hand big">Nothing on the nightstand…</p>
          <p class="hand">Pick up a book and start a fresh page in your notebook.</p>
        </div>`}
        <button class="btn btn--primary btn--block" data-action="add-reading">＋ ${reading.length ? 'Add another book' : 'Start a new book'}</button>
      </div>
    </div>
  </section>`;

  const mount = (root) => {
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-open]');
      if (c) ctx.navigate(`#/book/${c.dataset.open}`);
    });
    root.addEventListener('action:add-reading', () => bookForm(ctx, { status: 'reading' }));
  };
  return { html, mount };
}

/* ───────────────────────── Notebook (book page) ───────────────────────── */

function entriesHtml(logs, { editable }) {
  if (!logs.length) return `<p class="hand faint">No entries yet. Your first page of notes starts here.</p>`;
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  return sorted
    .map(
      (l) => `<div class="entry" data-log="${l.id}">
        <div class="entry-head">
          <span class="entry-date">${fmtDay(l.date)}</span>
          ${l.pages ? `<span class="entry-pages">${plural(l.pages, 'page')}</span>` : ''}
          ${editable ? `<button class="entry-edit" data-edit="${l.id}" aria-label="Edit entry">✎</button>` : ''}
        </div>
        ${l.notes?.length ? `<ul class="entry-notes">${l.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      </div>`
    )
    .join('');
}

function bulletLi(text = '') {
  return `<li><textarea class="bullet" rows="1" enterkeyhint="next" placeholder="a thought, a quote, a question…" aria-label="Note">${esc(text)}</textarea></li>`;
}

export function bookView(ctx, id) {
  const book = store.getBook(id);
  if (!book) return notFound(ctx);
  return book.status === 'finished' ? finishedBookView(ctx, book) : readingBookView(ctx, book);
}

function readingBookView(ctx, book) {
  const state = store.getState();
  const logs = store.logsFor(book.id);
  const p = bookProgress(book, state.logs);
  const today = todayStr();
  const reading = state.books.filter((b) => b.status === 'reading');
  const tabs = `<nav class="book-tabs" aria-label="Current reads">
    ${reading
      .map(
        (b) => `<button class="book-tab${b.id === book.id ? ' on' : ''}" data-switch="${b.id}" style="--c:${esc(b.color)}"${b.id === book.id ? ' aria-current="page"' : ''}>
          <i aria-hidden="true"></i><span>${esc(b.title)}</span>
        </button>`
      )
      .join('')}
    <button class="book-tab book-tab--add" data-action="add-reading" aria-label="Start another book">＋</button>
  </nav>`;

  const html = `<section class="view view--desk">
    ${head('Notebook', { back: 'Nightstand', right: `<button class="icon-btn" data-action="book-menu" aria-label="Book options">⋯</button>` })}
    <div class="view-scroll">
      ${tabs}
      <article class="paper notebook">
        <header class="nb-head">
          <h2 class="nb-title">${esc(book.title)}</h2>
          <p class="nb-author">${book.author ? `by ${esc(book.author)}` : '&nbsp;'}</p>
          <div class="nb-progress">
            <div class="pencil-bar"><span style="width:${p.pct}%"></span></div>
            <span class="nb-progress-text">p. ${num(p.currentPage)}${book.totalPages ? ` / ${num(book.totalPages)} · ${p.pct}%` : ''}</span>
          </div>
        </header>

        <form class="entry-form" autocomplete="off" novalidate>
          <div class="form-date">
            <span class="today-tag" data-today></span>
            <label class="date-pick">
              <span data-date-text>${fmtLong(today)}</span>
              <input type="date" name="date" value="${today}" max="${today}" aria-label="Date of this entry">
            </label>
          </div>
          <div class="line-row">
            <label for="pages-in">Pages read</label>
            <input id="pages-in" class="line-input" type="number" name="pages" inputmode="numeric" min="0" placeholder="0">
          </div>
          <div class="line-row">
            <label for="page-in" class="arrow">…or I’m now on page</label>
            <input id="page-in" class="line-input" type="number" name="page" inputmode="numeric" min="0" placeholder="${p.currentPage}">
          </div>
          <div class="notes-label">Notes</div>
          <ul class="bullets">${bulletLi()}</ul>
          <button type="button" class="add-bullet" data-action="add-bullet">＋ another note</button>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost hidden" data-action="cancel-edit">Cancel</button>
            <button type="submit" class="ink-btn">Log today's reading</button>
          </div>
        </form>

        <div class="entries">
          <h3 class="entries-title">Reading log</h3>
          ${entriesHtml(logs, { editable: true })}
        </div>
      </article>
      <div class="nb-footer">
        <button class="btn btn--gold btn--block" data-action="finish">🎉 I finished this book</button>
        <p class="nb-meta">Started ${fmtFull(book.startedAt || today)} · ${plural(p.days, 'day')} of reading</p>
      </div>
    </div>
  </section>`;

  const mount = (root) => {
    const form = $('.entry-form', root);
    const pagesIn = form.elements.pages;
    const pageIn = form.elements.page;
    const dateIn = form.elements.date;
    const submitBtn = $('.ink-btn', form);
    const cancelBtn = $('[data-action="cancel-edit"]', form);
    const bullets = $('.bullets', form);
    let editing = null;
    let base = p.currentPage;

    const setDate = (d) => {
      dateIn.value = d;
      $('[data-date-text]', form).textContent = fmtLong(d);
      $('[data-today]', form).textContent = d === today ? 'Today' : d === addDays(today, -1) ? 'Yesterday' : '';
      if (!editing) submitBtn.textContent = d === today ? "Log today's reading" : 'Log this reading';
    };
    setDate(today);
    dateIn.addEventListener('change', () => setDate(dateIn.value || today));

    pagesIn.addEventListener('input', () => {
      const v = Number(pagesIn.value);
      pageIn.value = pagesIn.value === '' ? '' : base + v;
    });
    pageIn.addEventListener('input', () => {
      const v = Number(pageIn.value);
      pagesIn.value = pageIn.value === '' ? '' : Math.max(0, v - base);
    });

    const wireBullet = (ta) => autoGrow(ta);
    $$('.bullet', bullets).forEach(wireBullet);
    const addBullet = (after, text = '') => {
      const tmp = document.createElement('ul');
      tmp.innerHTML = bulletLi(text);
      const li = tmp.firstElementChild;
      after ? after.after(li) : bullets.appendChild(li);
      const ta = $('.bullet', li);
      wireBullet(ta);
      ta.focus();
      return ta;
    };
    bullets.addEventListener('input', (e) => e.target.classList.contains('bullet') && autoGrow(e.target));
    bullets.addEventListener('keydown', (e) => {
      const ta = e.target;
      if (!ta.classList.contains('bullet')) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addBullet(ta.closest('li'));
      } else if (e.key === 'Backspace' && ta.value === '' && bullets.children.length > 1) {
        e.preventDefault();
        const li = ta.closest('li');
        const prev = li.previousElementSibling || li.nextElementSibling;
        li.remove();
        const pta = $('.bullet', prev);
        pta.focus();
        pta.setSelectionRange(pta.value.length, pta.value.length);
      }
    });

    const resetForm = () => {
      editing = null;
      base = p.currentPage;
      form.reset();
      bullets.innerHTML = bulletLi();
      $$('.bullet', bullets).forEach(wireBullet);
      cancelBtn.classList.add('hidden');
      form.classList.remove('editing');
      setDate(today);
    };

    root.addEventListener('action:add-bullet', () => addBullet(null));
    root.addEventListener('action:cancel-edit', resetForm);

    root.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]');
      if (!ed) return;
      const log = store.getState().logs.find((l) => l.id === ed.dataset.edit);
      if (!log) return;
      editing = log;
      base = p.currentPage - (Number(log.pages) || 0);
      setDate(log.date);
      pagesIn.value = log.pages || '';
      pageIn.value = log.pages ? base + log.pages : '';
      bullets.innerHTML = (log.notes?.length ? log.notes : ['']).map(bulletLi).join('');
      $$('.bullet', bullets).forEach(wireBullet);
      submitBtn.textContent = 'Update entry';
      cancelBtn.classList.remove('hidden');
      form.classList.add('editing');
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pages = Math.max(0, Math.round(Number(pagesIn.value) || 0));
      const notes = $$('.bullet', bullets).map((t) => t.value.trim()).filter(Boolean);
      if (!pages && !notes.length) {
        if (editing && (await confirmDialog('This entry is now empty. Delete it?', { ok: 'Delete', danger: true }))) {
          store.deleteLog(editing.id);
          ctx.afterChange();
          ctx.refresh();
          return;
        }
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        pagesIn.focus();
        return;
      }
      const date = dateIn.value || today;
      if (editing) {
        store.updateLog(editing.id, { date, pages, notes });
        toast('Entry updated', { icon: '✒️' });
      } else {
        store.addLog({ bookId: book.id, date, pages, notes });
        buzz(20);
      }
      ctx.afterChange({ logged: !editing });
      ctx.refresh();
      const after = bookProgress(book, store.getState().logs);
      if (!editing && book.totalPages && after.currentPage >= book.totalPages) {
        if (await confirmDialog('That was the last page! Mark this book as finished?', { ok: 'Yes, finished!', cancel: 'Not yet' })) {
          finishForm(ctx, book);
        }
      }
    });

    root.addEventListener('action:finish', () => finishForm(ctx, book));
    root.addEventListener('action:book-menu', () => bookMenu(ctx, book));
    root.addEventListener('action:add-reading', () => bookForm(ctx, { status: 'reading' }));
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-switch]');
      if (t && t.dataset.switch !== book.id) ctx.navigate(`#/book/${t.dataset.switch}`, { replace: true });
    });
    $('.book-tab.on', root)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  return { html, mount };
}

function finishedBookView(ctx, book) {
  const state = store.getState();
  const logs = store.logsFor(book.id);
  const p = bookProgress(book, state.logs);
  const span = book.startedAt && book.finishedAt ? daysBetween(book.startedAt, book.finishedAt) + 1 : null;

  const html = `<section class="view view--desk">
    ${head('Notebook', { back: 'Bookshelf', right: `<button class="icon-btn" data-action="book-menu" aria-label="Book options">⋯</button>` })}
    <div class="view-scroll">
      <article class="paper notebook notebook--done">
        <div class="stamp">Finished</div>
        <header class="nb-head">
          <h2 class="nb-title">${esc(book.title)}</h2>
          <p class="nb-author">${book.author ? `by ${esc(book.author)}` : '&nbsp;'}</p>
          <p class="nb-rating">${stars(book.rating || 0)}</p>
        </header>
        <dl class="facts">
          <div><dt>Read</dt><dd>${book.finishedAt ? `${book.startedAt ? `${fmtShort(book.startedAt)} – ` : ''}${fmtFull(book.finishedAt)}` : 'A while back'}</dd></div>
          <div><dt>Pages</dt><dd>${book.totalPages ? num(book.totalPages) : '—'}</dd></div>
          ${span ? `<div><dt>Took</dt><dd>${plural(span, 'day')}${p.days ? `, read on ${p.days}` : ''}</dd></div>` : ''}
        </dl>
        ${book.review ? `<div class="review"><h3 class="entries-title">Final thoughts</h3><p class="hand">${esc(book.review).replace(/\n/g, '<br>')}</p></div>` : ''}
        <div class="entries">
          <h3 class="entries-title">Notes from the reading</h3>
          ${entriesHtml(logs, { editable: false })}
        </div>
      </article>
    </div>
  </section>`;

  const mount = (root) => {
    root.addEventListener('action:book-menu', () => bookMenu(ctx, book));
  };
  return { html, mount };
}

function bookMenu(ctx, book) {
  const finished = book.status === 'finished';
  openModal(
    `<h2 class="modal-title">${esc(book.title)}</h2>
     <div class="menu-list">
       <button class="menu-item" data-m="edit">✎ Edit book details</button>
       ${finished ? `<button class="menu-item" data-m="reopen">↩ Move back to current reads</button>` : `<button class="menu-item" data-m="finish">🎉 Mark as finished</button>`}
       <button class="menu-item danger" data-m="delete">🗑 Delete book &amp; notes</button>
     </div>
     <div class="modal-actions"><button class="btn btn--ghost" data-close>Close</button></div>`,
    {
      className: 'modal--small',
      onMount: (m, close) =>
        m.addEventListener('click', async (e) => {
          const a = e.target.closest('[data-m]')?.dataset.m;
          if (!a) return;
          close();
          if (a === 'edit') bookForm(ctx, book);
          if (a === 'finish') finishForm(ctx, book);
          if (a === 'reopen') {
            store.updateBook(book.id, { status: 'reading', finishedAt: null });
            ctx.afterChange();
            ctx.refresh();
            toast('Back on the nightstand', { icon: '📖' });
          }
          if (a === 'delete' && (await confirmDialog(`Delete “${book.title}” and all its notes? This can't be undone.`, { ok: 'Delete', danger: true }))) {
            store.deleteBook(book.id);
            ctx.afterChange();
            ctx.navigate(finished ? '#/shelf' : '#/', { replace: true });
            toast('Book deleted');
          }
        }),
    }
  );
}

/* ───────────────────────── Forms ───────────────────────── */

export function bookForm(ctx, bookOrDefaults = {}) {
  const editing = Boolean(bookOrDefaults.id);
  const b = { title: '', author: '', totalPages: '', color: SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)], status: 'reading', rating: 0, ...bookOrDefaults };
  const today = todayStr();
  const isFinished = b.status === 'finished';
  let rating = b.rating || 0;
  let dated = isFinished ? Boolean(b.finishedAt) : true;

  openModal(
    `<form class="book-form" novalidate>
      <h2 class="modal-title">${editing ? 'Edit book' : isFinished ? 'Add a book you’ve read' : 'Start a new book'}</h2>
      <label class="field"><span>Title</span><input name="title" required value="${esc(b.title)}" placeholder="The Name of the Rose" autocapitalize="words"></label>
      <label class="field"><span>Author</span><input name="author" value="${esc(b.author)}" placeholder="Umberto Eco" autocapitalize="words"></label>
      <label class="field"><span>Total pages <em>(optional)</em></span><input name="totalPages" type="number" inputmode="numeric" min="1" value="${esc(b.totalPages)}" placeholder="512"></label>
      ${isFinished ? `<div class="field"><span>When did you read it?</span>
        <div class="segmented" role="radiogroup">
          <button type="button" role="radio" class="seg${dated ? '' : ' on'}" data-dated="0" aria-checked="${!dated}">Don’t remember</button>
          <button type="button" role="radio" class="seg${dated ? ' on' : ''}" data-dated="1" aria-checked="${dated}">Pick a date</button>
        </div>
        <small class="field-hint" data-hint>${dated ? 'Counts toward that year’s goal.' : 'Goes on your shelf without counting toward any yearly goal.'}</small>
      </div>` : ''}
      <div class="field-row" data-dates ${dated ? '' : 'hidden'}>
        <label class="field"><span>Started${isFinished ? ' <em>(optional)</em>' : ''}</span><input name="startedAt" type="date" max="${today}" value="${esc(b.startedAt || (isFinished ? '' : today))}"></label>
        ${isFinished ? `<label class="field"><span>Finished</span><input name="finishedAt" type="date" max="${today}" value="${esc(b.finishedAt || today)}"></label>` : ''}
      </div>
      ${isFinished ? `<div class="field"><span>Rating</span>${stars(rating, { input: true })}</div>
        <label class="field"><span>Final thoughts <em>(optional)</em></span><textarea name="review" rows="3" placeholder="What stayed with you?">${esc(b.review || '')}</textarea></label>` : ''}
      <div class="field"><span>Spine colour</span>
        <div class="swatches">${SPINE_COLORS.map((c) => `<button type="button" class="swatch${c === b.color ? ' on' : ''}" data-color="${c}" style="--c:${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
      </div>
      <p class="form-error" hidden></p>
      <div class="modal-actions">
        ${!editing && isFinished ? `<button type="submit" class="btn btn--ghost" data-again>Save &amp; add another</button>` : `<button type="button" class="btn btn--ghost" data-close>Cancel</button>`}
        <button type="submit" class="btn btn--primary">${editing ? 'Save' : isFinished ? 'Put it on the shelf' : 'Put it on the nightstand'}</button>
      </div>
    </form>`,
    {
      onMount: (m, close) => {
        const form = $('form', m);
        let color = b.color;
        let again = false;
        const sr = $('.stars--input', m);
        if (sr) bindStars(sr, (n) => (rating = n));
        m.addEventListener('click', (e) => {
          const sw = e.target.closest('[data-color]');
          if (sw) {
            color = sw.dataset.color;
            $$('.swatch', m).forEach((s) => s.classList.toggle('on', s === sw));
          }
          const seg = e.target.closest('[data-dated]');
          if (seg) {
            dated = seg.dataset.dated === '1';
            $$('[data-dated]', m).forEach((x) => {
              x.classList.toggle('on', x === seg);
              x.setAttribute('aria-checked', String(x === seg));
            });
            $('[data-dates]', m).hidden = !dated;
            $('[data-hint]', m).textContent = dated ? 'Counts toward that year’s goal.' : 'Goes on your shelf without counting toward any yearly goal.';
          }
          if (e.target.closest('[data-again]')) again = true;
        });
        if (!editing) setTimeout(() => form.elements.title.focus(), 250);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const f = form.elements;
          const title = f.title.value.trim();
          const err = $('.form-error', m);
          if (!title) {
            err.textContent = 'Every book needs a title.';
            err.hidden = false;
            again = false;
            f.title.focus();
            return;
          }
          const data = {
            title,
            author: f.author.value.trim(),
            totalPages: Math.max(0, Math.round(Number(f.totalPages.value) || 0)),
            color,
          };
          if (isFinished) {
            data.rating = rating;
            data.review = f.review.value.trim();
            data.dateConfirmed = true;
            if (dated) {
              data.finishedAt = f.finishedAt.value || today;
              data.startedAt = f.startedAt.value || null;
              if (data.startedAt && data.finishedAt < data.startedAt) data.startedAt = data.finishedAt;
            } else {
              data.finishedAt = null;
              data.startedAt = null;
            }
          } else {
            data.startedAt = f.startedAt.value || today;
          }
          close();
          if (editing) {
            store.updateBook(b.id, data);
            ctx.afterChange();
            ctx.refresh();
            toast('Saved', { icon: '✒️' });
            return;
          }
          const nb = store.addBook({ ...data, status: b.status });
          ctx.afterChange({ finished: isFinished });
          if (isFinished) {
            ctx.refresh();
            toast(`<b>${esc(nb.title)}</b> is on the shelf${nb.finishedAt ? '' : ' (no date)'}`, { icon: '📚' });
            if (again) setTimeout(() => bookForm(ctx, { status: 'finished', finishedAt: null }), 260);
          } else {
            ctx.navigate(`#/book/${nb.id}`);
            toast(`A fresh notebook for <b>${esc(nb.title)}</b>`, { icon: '📓' });
          }
        });
      },
    }
  );
}

export function finishForm(ctx, book) {
  const today = todayStr();
  let rating = 0;
  openModal(
    `<form class="book-form" novalidate>
      <div class="finish-hero">🎉</div>
      <h2 class="modal-title">You finished<br><em>${esc(book.title)}</em></h2>
      <div class="field"><span>How was it?</span>${stars(0, { input: true })}</div>
      <label class="field"><span>Finished on</span><input name="finishedAt" type="date" max="${today}" value="${today}"></label>
      <label class="field"><span>Final thoughts</span><textarea name="review" rows="4" placeholder="What will you remember about this one?"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn btn--ghost" data-close>Not yet</button>
        <button type="submit" class="btn btn--gold">Put it on the shelf</button>
      </div>
    </form>`,
    {
      onMount: (m, close) => {
        bindStars($('.stars--input', m), (n) => (rating = n));
        $('form', m).addEventListener('submit', (e) => {
          e.preventDefault();
          const f = e.target.elements;
          const finishedAt = f.finishedAt.value || today;
          store.updateBook(book.id, {
            status: 'finished',
            finishedAt,
            startedAt: book.startedAt && book.startedAt <= finishedAt ? book.startedAt : finishedAt,
            rating,
            review: f.review.value.trim(),
          });
          close();
          ctx.afterChange({ finished: true });
          ctx.navigate('#/shelf', { replace: true });
          ctx.celebrate();
          const s = computeStats(store.getState());
          toast(`<b>${esc(book.title)}</b> joins the shelf — book ${s.finishedThisYear.length} of ${s.goalBooks || '∞'} this year`, { icon: '📚', ms: 5000 });
        });
      },
    }
  );
}

/* ───────────────────────── Stats ───────────────────────── */

function ring(value, max, { size = 112, stroke = 10, label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-fill)" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <div class="ring-label"><b>${label}</b><span>${sub}</span></div>
  </div>`;
}

function heatmap(stats) {
  const weeks = 17;
  const today = stats.today;
  const dow = parseDate(today).getDay();
  const start = addDays(today, -(weeks - 1) * 7 - dow);
  const goal = stats.goalDaily || 20;
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    if (d > today) {
      cells += `<i class="hm-cell future"></i>`;
      continue;
    }
    const p = stats.daily.get(d) || 0;
    const lvl = p === 0 ? 0 : p < goal * 0.5 ? 1 : p < goal ? 2 : p < goal * 2 ? 3 : 4;
    cells += `<i class="hm-cell l${lvl}${d === today ? ' today' : ''}" title="${fmtShort(d)}: ${plural(p, 'page')}"></i>`;
  }
  const months = [];
  for (let w = 0; w < weeks; w++) {
    const d = parseDate(addDays(start, w * 7));
    const prev = w ? parseDate(addDays(start, (w - 1) * 7)) : null;
    months.push(!prev || prev.getMonth() !== d.getMonth() ? d.toLocaleDateString(undefined, { month: 'short' }) : '');
  }
  return `<div class="heatmap-wrap">
    <div class="hm-months" style="--weeks:${weeks}">${months.map((m) => `<span>${m}</span>`).join('')}</div>
    <div class="heatmap" style="--weeks:${weeks}">${cells}</div>
    <div class="hm-legend">less <i class="hm-cell l0"></i><i class="hm-cell l1"></i><i class="hm-cell l2"></i><i class="hm-cell l3"></i><i class="hm-cell l4"></i> more</div>
  </div>`;
}

function monthBars(stats) {
  const max = Math.max(1, ...stats.monthly);
  const thisMonth = parseDate(stats.today).getMonth();
  return `<div class="bars">${stats.monthly
    .map((v, i) => {
      const label = new Date(stats.year, i, 1).toLocaleDateString(undefined, { month: 'narrow' });
      return `<div class="bar${i === thisMonth ? ' now' : ''}${i > thisMonth ? ' future' : ''}">
        <span class="bar-val">${v ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v) : ''}</span>
        <span class="bar-fill" style="height:${((v / max) * 100).toFixed(1)}%"></span>
        <span class="bar-label">${label}</span>
      </div>`;
    })
    .join('')}</div>`;
}

export function statsView(ctx) {
  const state = store.getState();
  const s = computeStats(state);
  const unlocked = new Set(Object.keys(state.unlocked));
  const earned = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) || a.test(s));
  const xpPct = Math.round(((s.xp - s.levelStart) / (s.levelEnd - s.levelStart)) * 100);
  const streakMsg = s.readToday
    ? 'You read today — the fire is roaring.'
    : s.currentStreak > 0
      ? 'Read today to keep the fire burning!'
      : 'Read a few pages today to light the fire.';
  const ahead = s.paceDiff;
  const paceMsg = !s.goalBooks
    ? ''
    : s.finishedThisYear.length >= s.goalBooks
      ? 'Goal reached! Everything now is a bonus.'
      : Math.abs(ahead) < 0.5
        ? 'Right on pace.'
        : ahead > 0
          ? `${plural(Math.round(ahead), 'book')} ahead of pace`
          : `${plural(Math.round(-ahead), 'book')} behind pace`;
  const next = s.levelEnd - s.xp;

  const html = `<section class="view view--stats">
    ${head('By the Fire')}
    <div class="view-scroll">
      <div class="stats-grid">
        <div class="card card--level">
          <div class="level-badge"><span>Lv</span><b>${s.level}</b></div>
          <div class="level-body">
            <div class="level-title">${esc(s.levelTitle)}</div>
            <div class="xp-bar"><span style="width:${xpPct}%"></span></div>
            <div class="small">${num(s.xp)} XP · ${num(next)} to level ${s.level + 1}${levelTitle(s.level + 1) !== s.levelTitle ? ` — <em>${esc(levelTitle(s.level + 1))}</em>` : ''}</div>
          </div>
        </div>

        <div class="card card--streak">
          <div class="streak-flame${s.currentStreak ? ' lit' : ''}" aria-hidden="true">
            <svg viewBox="0 0 40 52"><path d="M20 2c4 10 16 16 16 30a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 2 9 5 10-2-10 1-17 3-24z" fill="url(#sfg)"/><defs><linearGradient id="sfg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd36a"/><stop offset=".6" stop-color="#ff7a1a"/><stop offset="1" stop-color="#c2321a"/></linearGradient></defs></svg>
          </div>
          <div>
            <div class="big-num">${s.currentStreak}<small> day${s.currentStreak === 1 ? '' : 's'}</small></div>
            <div class="card-label">Current streak</div>
            <div class="small">${streakMsg}</div>
            <div class="small">Longest: <b>${plural(s.longestStreak, 'day')}</b></div>
          </div>
        </div>

        <div class="card card--ring">
          ${ring(s.pagesToday, s.goalDaily, { label: num(s.pagesToday), sub: `of ${num(s.goalDaily)} pages` })}
          <div class="card-label">Today</div>
          <div class="small">${s.pagesToday >= s.goalDaily && s.goalDaily ? 'Daily goal met ✓' : `${num(Math.max(0, s.goalDaily - s.pagesToday))} pages to go`}</div>
        </div>

        <div class="card card--ring">
          ${ring(s.finishedThisYear.length, s.goalBooks, { label: `${s.finishedThisYear.length}`, sub: `of ${s.goalBooks} books` })}
          <div class="card-label">${s.year} goal</div>
          <div class="small">${paceMsg}</div>
        </div>

        <div class="card card--wide">
          <div class="totals">
            <div><b>${num(s.totalPages)}</b><span>pages, all time</span></div>
            <div><b>${num(s.pagesThisYear)}</b><span>pages in ${s.year}</span></div>
            <div><b>${num(s.finished.length)}</b><span>books finished</span></div>
            <div><b>${num(s.readingDays)}</b><span>days spent reading</span></div>
            <div><b>${num(s.avgPagesPerDay)}</b><span>pages/day avg (${s.year})</span></div>
            <div><b>${s.avgRating ? s.avgRating.toFixed(1) + '★' : '—'}</b><span>average rating</span></div>
          </div>
        </div>

        <div class="card card--wide">
          <h3 class="card-title">Reading days</h3>
          ${heatmap(s)}
        </div>

        <div class="card card--wide">
          <h3 class="card-title">Pages by month · ${s.year}</h3>
          ${monthBars(s)}
        </div>

        <div class="card card--wide">
          <h3 class="card-title">Achievements <span class="muted">${earned.length} / ${ACHIEVEMENTS.length}</span></h3>
          <div class="badges">
            ${ACHIEVEMENTS.map((a) => {
              const on = earned.includes(a);
              return `<div class="badge${on ? ' on' : ''}" title="${esc(a.desc)}">
                <span class="badge-icon">${on ? a.icon : '🔒'}</span>
                <span class="badge-name">${esc(a.name)}</span>
                <span class="badge-desc">${esc(a.desc)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card card--wide">
          <h3 class="card-title">Goals</h3>
          <form class="goals-form">
            <label class="goal-field"><span>Books per year</span><input type="number" name="booksPerYear" inputmode="numeric" min="1" value="${s.goalBooks}"></label>
            <label class="goal-field"><span>Pages per day</span><input type="number" name="pagesPerDay" inputmode="numeric" min="1" value="${s.goalDaily}"></label>
          </form>
          <p class="small muted">XP: 1 per page · 10 per reading day · 100 per finished book.</p>
        </div>
      </div>
    </div>
  </section>`;

  const mount = (root) => {
    const form = $('.goals-form', root);
    form.addEventListener('change', () => {
      const f = form.elements;
      store.setGoals({
        booksPerYear: Math.max(1, Math.round(Number(f.booksPerYear.value) || 12)),
        pagesPerDay: Math.max(1, Math.round(Number(f.pagesPerDay.value) || 20)),
      });
      ctx.afterChange();
      ctx.refresh();
      toast('Goals updated', { icon: '🎯' });
    });
  };
  return { html, mount };
}

/* ───────────────────────── Settings ───────────────────────── */

export function settingsModal(ctx) {
  const state = store.getState();
  const empty = !state.books.length && !state.logs.length;
  openModal(
    `<h2 class="modal-title">Settings</h2>
     <div class="menu-list">
       <button class="menu-item" data-m="export">⬇ Export a backup</button>
       <label class="menu-item">⬆ Restore from a backup<input type="file" accept="application/json,.json" hidden data-import></label>
       ${empty ? `<button class="menu-item" data-m="sample">✨ Fill with sample data (to look around)</button>` : ''}
       <button class="menu-item danger" data-m="erase">🗑 Erase everything</button>
     </div>
     <div class="settings-note small">
       <p>Your reading log lives only on this device, in this browser. Export a backup now and then to keep it safe.</p>
       <p><b>Install it:</b> on iPhone, tap Share → <em>Add to Home Screen</em>. On Android, tap ⋮ → <em>Install app</em>.</p>
     </div>
     <div class="modal-actions"><button class="btn btn--ghost" data-close>Close</button></div>`,
    {
      className: 'modal--small',
      onMount: (m, close) => {
        $('[data-import]', m).addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            if (!Array.isArray(data.books) || !Array.isArray(data.logs)) throw new Error('bad file');
            if (!(await confirmDialog(`Replace everything here with this backup (${plural(data.books.length, 'book')})?`, { ok: 'Restore', danger: true }))) return;
            store.replaceAll(data);
            close();
            ctx.afterChange({ silent: true });
            ctx.navigate('#/', { replace: true });
            toast('Backup restored', { icon: '📦' });
          } catch {
            toast("That file doesn't look like a Reading Log backup.", { icon: '⚠️' });
          }
        });
        m.addEventListener('click', async (e) => {
          const a = e.target.closest('[data-m]')?.dataset.m;
          if (a === 'export') exportBackup();
          if (a === 'sample') {
            const { sampleData } = await import('./sample.js');
            store.replaceAll(sampleData());
            close();
            ctx.afterChange({ silent: true });
            ctx.navigate('#/', { replace: true });
            toast('Sample library loaded — erase it in Settings when you start for real.', { icon: '✨', ms: 5000 });
          }
          if (a === 'erase' && (await confirmDialog('Erase all books, notes and stats from this device?', { ok: 'Erase everything', danger: true }))) {
            store.resetAll();
            close();
            ctx.afterChange({ silent: true });
            ctx.navigate('#/', { replace: true });
            toast('A clean slate');
          }
        });
      },
    }
  );
}

async function exportBackup() {
  const name = `reading-log-${todayStr()}.json`;
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Reading Log backup' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function notFound(ctx) {
  return {
    html: `<section class="view view--desk">${head('Not found')}<div class="view-scroll"><p class="empty-note">That book isn't here anymore.</p></div></section>`,
    mount: () => {},
  };
}
