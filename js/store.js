// Persistent app state, kept in localStorage on the device.
import { todayStr } from './dates.js';

const KEY = 'readingLog.v1';

const defaults = () => ({
  version: 1,
  books: [],
  logs: [],
  goals: { booksPerYear: 12, pagesPerDay: 20 },
  unlocked: {},
  level: 1,
  createdAt: new Date().toISOString(),
});

function normalize(d) {
  const base = defaults();
  return {
    ...base,
    ...d,
    books: Array.isArray(d.books) ? d.books : [],
    logs: Array.isArray(d.logs) ? d.logs : [],
    goals: { ...base.goals, ...(d.goals || {}) },
    unlocked: d.unlocked || {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save', e);
  }
}

export const getState = () => state;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const getBook = (id) => state.books.find((b) => b.id === id);
export const logsFor = (bookId) => state.logs.filter((l) => l.bookId === bookId);

export function addBook(data) {
  const book = {
    id: uid(),
    title: '',
    author: '',
    totalPages: 0,
    color: '#7a2e2e',
    status: 'reading',
    startedAt: todayStr(),
    finishedAt: null,
    rating: 0,
    review: '',
    createdAt: new Date().toISOString(),
    ...data,
  };
  state.books.push(book);
  save();
  return book;
}

export function updateBook(id, patch) {
  const b = getBook(id);
  if (b) Object.assign(b, patch);
  save();
  return b;
}

export function deleteBook(id) {
  state.books = state.books.filter((b) => b.id !== id);
  state.logs = state.logs.filter((l) => l.bookId !== id);
  save();
}

export function addLog({ bookId, date, pages, notes }) {
  const log = {
    id: uid(),
    bookId,
    date,
    pages: Math.max(0, Number(pages) || 0),
    notes: (notes || []).map((n) => n.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  state.logs.push(log);
  save();
  return log;
}

export function updateLog(id, patch) {
  const l = state.logs.find((x) => x.id === id);
  if (l) {
    Object.assign(l, patch);
    l.pages = Math.max(0, Number(l.pages) || 0);
    l.notes = (l.notes || []).map((n) => n.trim()).filter(Boolean);
  }
  save();
  return l;
}

export function deleteLog(id) {
  state.logs = state.logs.filter((l) => l.id !== id);
  save();
}

export function setGoals(goals) {
  state.goals = { ...state.goals, ...goals };
  save();
}

export function markUnlocked(ids) {
  const now = new Date().toISOString();
  ids.forEach((id) => (state.unlocked[id] = state.unlocked[id] || now));
  save();
}

export function setLevel(level) {
  state.level = level;
  save();
}

export function replaceAll(data) {
  state = normalize(data);
  save();
}

export function resetAll() {
  state = defaults();
  save();
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}
