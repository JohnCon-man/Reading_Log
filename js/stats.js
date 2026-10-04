// Derived numbers: streaks, totals, goals, XP and levels.
import { todayStr, addDays, daysBetween, yearOf } from './dates.js';

export const LEVEL_TITLES = [
  [1, 'Curious Browser'],
  [2, 'Page Turner'],
  [3, 'Chapter Chaser'],
  [5, 'Bookworm'],
  [7, 'Devoted Reader'],
  [10, 'Bibliophile'],
  [13, 'Scholar'],
  [16, 'Sage of the Stacks'],
  [20, 'Keeper of the Library'],
  [25, 'Legend of Alexandria'],
];

export const levelTitle = (level) =>
  LEVEL_TITLES.filter(([l]) => level >= l).pop()[1];

// XP: 1 per page, 100 per finished book, 10 per day you read.
const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
const xpForLevel = (level) => 50 * (level - 1) ** 2;

export function bookProgress(book, logs) {
  const mine = logs.filter((l) => l.bookId === book.id);
  const pagesRead = mine.reduce((s, l) => s + (Number(l.pages) || 0), 0);
  const total = Number(book.totalPages) || 0;
  const currentPage = total ? Math.min(total, pagesRead) : pagesRead;
  const pct = total ? Math.min(100, Math.round((currentPage / total) * 100)) : 0;
  const dates = [...new Set(mine.map((l) => l.date))].sort();
  return {
    pagesRead,
    currentPage,
    pct,
    sessions: mine.length,
    days: dates.length,
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
  };
}

export function computeStats(state, today = todayStr()) {
  const year = yearOf(today);
  const daily = new Map();
  const monthly = Array(12).fill(0);
  let totalPages = 0;
  let pagesThisYear = 0;
  let notesCount = 0;
  let earlyBird = false;
  let nightOwl = false;

  for (const l of state.logs) {
    const p = Number(l.pages) || 0;
    daily.set(l.date, (daily.get(l.date) || 0) + p);
    totalPages += p;
    if (yearOf(l.date) === year) {
      pagesThisYear += p;
      monthly[Number(l.date.slice(5, 7)) - 1] += p;
    }
    notesCount += (l.notes || []).length;
    if (l.createdAt && l.date === l.createdAt.slice(0, 10)) {
      const h = new Date(l.createdAt).getHours();
      if (h >= 4 && h < 7) earlyBird = true;
      if (h >= 23 || h < 4) nightOwl = true;
    }
  }

  const readDates = [...daily.entries()].filter(([, p]) => p > 0).map(([d]) => d).sort();
  const readSet = new Set(readDates);
  const pagesToday = daily.get(today) || 0;
  const readToday = readSet.has(today);

  let currentStreak = 0;
  let cursor = readToday ? today : addDays(today, -1);
  while (readSet.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of readDates) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  const finished = state.books.filter((b) => b.status === 'finished');
  const finishedThisYear = finished.filter((b) => b.finishedAt && yearOf(b.finishedAt) === year);
  const reading = state.books.filter((b) => b.status === 'reading');

  const goalBooks = Number(state.goals.booksPerYear) || 0;
  const goalDaily = Number(state.goals.pagesPerDay) || 0;
  const dayOfYear = daysBetween(`${year}-01-01`, today) + 1;
  const daysInYear = daysBetween(`${year}-01-01`, `${year + 1}-01-01`);
  const expectedBooks = (goalBooks * dayOfYear) / daysInYear;

  const xp = totalPages + finished.length * 100 + readDates.length * 10;
  const level = levelFromXp(xp);
  const rated = finished.filter((b) => b.rating > 0);

  return {
    today,
    year,
    daily,
    monthly,
    totalPages,
    pagesThisYear,
    pagesToday,
    readToday,
    readingDays: readDates.length,
    currentStreak,
    longestStreak,
    notesCount,
    earlyBird,
    nightOwl,
    maxPagesInDay: Math.max(0, ...daily.values()),
    finished,
    finishedThisYear,
    reading,
    goalBooks,
    goalDaily,
    expectedBooks,
    paceDiff: finishedThisYear.length - expectedBooks,
    avgPagesPerDay: Math.round(pagesThisYear / dayOfYear),
    avgRating: rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0,
    biggestBook: Math.max(0, ...finished.map((b) => Number(b.totalPages) || 0)),
    xp,
    level,
    levelTitle: levelTitle(level),
    levelStart: xpForLevel(level),
    levelEnd: xpForLevel(level + 1),
  };
}

// How big the fireplace burns, driven by the reading streak.
export function fireLevel(streak) {
  if (streak === 0) return 0.5;
  if (streak < 3) return 0.72;
  if (streak < 7) return 0.88;
  if (streak < 14) return 1;
  return 1.14;
}
