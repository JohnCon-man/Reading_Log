// Badges. Each test receives the output of computeStats().
export const ACHIEVEMENTS = [
  { id: 'first-log', icon: '📖', name: 'First Page', desc: 'Log your first reading session', test: (s) => s.readingDays >= 1 },
  { id: 'streak-3', icon: '🪵', name: 'Kindling', desc: 'Read 3 days in a row', test: (s) => s.longestStreak >= 3 },
  { id: 'streak-7', icon: '🔥', name: 'Week of Embers', desc: 'Read 7 days in a row', test: (s) => s.longestStreak >= 7 },
  { id: 'streak-14', icon: '🕯️', name: 'Steady Flame', desc: 'Read 14 days in a row', test: (s) => s.longestStreak >= 14 },
  { id: 'streak-30', icon: '🏮', name: 'Hearthkeeper', desc: 'Read 30 days in a row', test: (s) => s.longestStreak >= 30 },
  { id: 'streak-100', icon: '☀️', name: 'Eternal Flame', desc: 'Read 100 days in a row', test: (s) => s.longestStreak >= 100 },
  { id: 'day-50', icon: '🌊', name: 'Deep Dive', desc: 'Read 50 pages in one day', test: (s) => s.maxPagesInDay >= 50 },
  { id: 'day-100', icon: '💯', name: 'Centurion', desc: 'Read 100 pages in one day', test: (s) => s.maxPagesInDay >= 100 },
  { id: 'pages-1k', icon: '📜', name: 'A Thousand Pages', desc: 'Read 1,000 pages in total', test: (s) => s.totalPages >= 1000 },
  { id: 'pages-5k', icon: '🗺️', name: 'Long Road', desc: 'Read 5,000 pages in total', test: (s) => s.totalPages >= 5000 },
  { id: 'pages-10k', icon: '🏔️', name: 'Ten Thousand Leagues', desc: 'Read 10,000 pages in total', test: (s) => s.totalPages >= 10000 },
  { id: 'book-1', icon: '📕', name: 'The First Shelf', desc: 'Finish your first book', test: (s) => s.finished.length >= 1 },
  { id: 'book-5', icon: '📚', name: 'A Handful', desc: 'Finish 5 books', test: (s) => s.finished.length >= 5 },
  { id: 'book-10', icon: '🎓', name: 'Double Digits', desc: 'Finish 10 books', test: (s) => s.finished.length >= 10 },
  { id: 'book-25', icon: '🦉', name: 'Well-Read', desc: 'Finish 25 books', test: (s) => s.finished.length >= 25 },
  { id: 'book-50', icon: '🏛️', name: 'Library Builder', desc: 'Finish 50 books', test: (s) => s.finished.length >= 50 },
  { id: 'goal-year', icon: '🏆', name: 'Goal Crusher', desc: 'Hit your yearly book goal', test: (s) => s.goalBooks > 0 && s.finishedThisYear.length >= s.goalBooks },
  { id: 'big-book', icon: '🧱', name: 'Doorstopper', desc: 'Finish a book of 600+ pages', test: (s) => s.biggestBook >= 600 },
  { id: 'notes-50', icon: '✒️', name: 'Scribe', desc: 'Write 50 notes', test: (s) => s.notesCount >= 50 },
  { id: 'days-30', icon: '📅', name: 'Habit Formed', desc: 'Read on 30 different days', test: (s) => s.readingDays >= 30 },
  { id: 'early-bird', icon: '🌅', name: 'Early Bird', desc: 'Log reading before 7 am', test: (s) => s.earlyBird },
  { id: 'night-owl', icon: '🌙', name: 'Night Owl', desc: 'Log reading after 11 pm', test: (s) => s.nightOwl },
];

export function earnedIds(stats, unlocked = {}) {
  return ACHIEVEMENTS.filter((a) => unlocked[a.id] || a.test(stats)).map((a) => a.id);
}
