/**
 * 사람 × Day 행렬. /admin 의 그 표.
 *
 * 세로로 훑으면 그날 누가 안 냈는지, 가로로 훑으면 누가 멈췄는지 보인다.
 */

import { DAYS } from './dayFields.js';
import { latestDay, scheduledDaysBetween, toISO } from './schedule.js';

export const CELL = {
  ACCEPTED: 'O',
  SUBMITTED: 'O',
  REVIEW: '△',
  RETURNED: '↩',
  EMPTY: '',
};

export function buildMatrix({ users, submissions, day1, today, absentLimit = 2 }) {
  const byUser = new Map();
  for (const s of submissions) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, new Map());
    byUser.get(s.userId).set(s.day, s);
  }

  const openDay = latestDay(day1, today);

  const rows = users
    .filter((u) => u.role !== 'admin')
    .map((u) => {
      const got = byUser.get(String(u._id)) ?? new Map();
      const cells = DAYS.map((d) => {
        const s = got.get(d);
        if (!s) return { day: d, mark: CELL.EMPTY, id: null };
        if (s.status === 'returned') return { day: d, mark: CELL.RETURNED, id: String(s._id) };
        return { day: d, mark: CELL.ACCEPTED, id: String(s._id) };
      });

      const dates = [...got.values()]
        .map((s) => toISO(new Date(s.updatedAt ?? s.createdAt)))
        .sort();
      const last = dates.at(-1) ?? null;
      const silentFor = last
        ? scheduledDaysBetween(day1, new Date(`${last}T00:00:00Z`), today)
        : Math.max(openDay + 1, 0);

      return {
        userId: String(u._id),
        name: u.name ?? u.email,
        image: u.image ?? null,
        cells,
        done: got.size,
        lastAt: last,
        silentFor,
        quiet: silentFor >= absentLimit && openDay >= 1,
      };
    });

  rows.sort((a, b) => Number(b.quiet) - Number(a.quiet) || a.name.localeCompare(b.name, 'ko'));

  return { days: DAYS, rows, openDay };
}

/** Day별 완료율. 2기 커리큘럼 조정의 근거가 된다. */
export function dayStats({ rows, days }) {
  const total = rows.length || 1;
  return days.map((d) => {
    const cells = rows.map((r) => r.cells.find((c) => c.day === d));
    const done = cells.filter((c) => c.mark !== CELL.EMPTY).length;
    return { day: d, done, total: rows.length, rate: Math.round((done / total) * 100) };
  });
}
