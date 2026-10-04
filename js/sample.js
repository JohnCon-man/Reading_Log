// A small, believable library for exploring the app.
import { todayStr, addDays } from './dates.js';

const BOOKS = [
  ['The Name of the Rose', 'Umberto Eco', 536, '#7a2e2e', 5, 'A murder mystery wrapped in a library wrapped in a labyrinth.'],
  ['Meditations', 'Marcus Aurelius', 254, '#7a5a2a', 5, 'Short, sharp, and somehow still the best advice going.'],
  ['The Hobbit', 'J.R.R. Tolkien', 310, '#2f5a45', 4, ''],
  ['Piranesi', 'Susanna Clarke', 272, '#1f4f5a', 5, 'The House is beautiful beyond measure; kindness beyond measure.'],
  ['East of Eden', 'John Steinbeck', 601, '#8a3b1f', 5, 'Timshel.'],
  ['Thinking, Fast and Slow', 'Daniel Kahneman', 499, '#2b3f6b', 4, ''],
  ['The Remains of the Day', 'Kazuo Ishiguro', 258, '#5a2f55', 4, 'Quietly devastating.'],
  ['Dune', 'Frank Herbert', 617, '#a0522d', 5, ''],
  ['A Gentleman in Moscow', 'Amor Towles', 462, '#4a3a7a', 4, ''],
];
const READING = [
  ['The Count of Monte Cristo', 'Alexandre Dumas', 1276, '#2e2e4f'],
  ['The Overstory', 'Richard Powers', 502, '#2f5a45'],
];
const NOTES = [
  'Loved the opening line',
  'The library scene is incredible',
  'Need to look up this reference',
  '“All we have to decide is what to do with the time that is given us.”',
  'Pacing slows here but the payoff is worth it',
  'Interesting parallel with the first chapter',
  'New character — suspicious already',
  'Re-read this passage twice',
  'Great description of the setting',
  'This would make a good discussion question',
];

export function sampleData() {
  const today = todayStr();
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const books = [];
  const logs = [];
  let id = 0;
  const nid = () => `s${(id++).toString(36)}`;
  const log = (bookId, date, pages, withNote) => {
    const notes = withNote ? [NOTES[Math.floor(rand() * NOTES.length)]] : [];
    if (withNote && rand() > 0.6) notes.push(NOTES[Math.floor(rand() * NOTES.length)]);
    logs.push({ id: nid(), bookId, date, pages, notes, createdAt: `${date}T21:${String(10 + Math.floor(rand() * 40))}:00` });
  };

  // Finished books spread over the last ~14 months.
  let cursor = addDays(today, -40);
  BOOKS.forEach(([title, author, total, color, rating, review], i) => {
    const bookId = nid();
    const span = Math.max(8, Math.round(total / 22));
    const start = addDays(cursor, -span);
    books.push({ id: bookId, title, author, totalPages: total, color, status: 'finished', startedAt: start, finishedAt: cursor, rating, review, createdAt: start });
    let left = total;
    for (let d = 0; d <= span && left > 0; d++) {
      if (rand() < 0.2) continue;
      const p = Math.min(left, 12 + Math.floor(rand() * 34));
      left -= p;
      log(bookId, addDays(start, d), p, rand() < 0.45);
    }
    if (left > 0) log(bookId, cursor, left, true);
    cursor = addDays(start, -(4 + Math.floor(rand() * 10)) - (i === 3 ? 30 : 0));
  });

  // Two books on the nightstand with a live streak.
  READING.forEach(([title, author, total, color], i) => {
    const bookId = nid();
    const start = addDays(today, i ? -9 : -34);
    books.push({ id: bookId, title, author, totalPages: total, color, status: 'reading', startedAt: start, finishedAt: null, rating: 0, review: '', createdAt: start });
    const days = i ? 9 : 34;
    for (let d = 0; d <= days; d++) {
      const date = addDays(start, d);
      if (date === today) continue;
      if (i === 0 && d > days - 9) continue;
      if (rand() < 0.15 && d < days - 9) continue;
      log(bookId, date, 14 + Math.floor(rand() * 30), rand() < 0.5);
    }
  });

  return { version: 1, books, logs, goals: { booksPerYear: 12, pagesPerDay: 20 }, unlocked: {}, level: 1, createdAt: new Date().toISOString() };
}
