/**
 * Day 번호 ↔ 날짜.
 *
 * 주 5일 × 3주 = 15일. 주말은 밀린 걸 따라잡는 날이라 Day를 배정하지 않는다.
 * Day 0 은 '시작 3일 전' 준비일.
 *
 * 이탈 판정은 반드시 '퀘스트가 있는 날'만 센다. 금요일에 내고 월요일에 안 내면
 * 달력으로는 3일이지만 미제출은 1일이다.
 */

const DAY_MS = 86400000;

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function isWeekend(date) {
  const w = date.getUTCDay();
  return w === 0 || w === 6;
}

/** Day N 의 날짜. Day 1 부터 평일만 세어 나간다. */
export function dayToDate(day1, day) {
  if (day === 0) return new Date(day1.getTime() - 3 * DAY_MS);
  let d = new Date(day1.getTime());
  let remaining = day - 1;
  while (remaining > 0) {
    d = new Date(d.getTime() + DAY_MS);
    if (!isWeekend(d)) remaining -= 1;
  }
  return d;
}

export function scheduleMap(day1) {
  const out = new Map();
  for (let n = 0; n <= 15; n += 1) out.set(n, dayToDate(day1, n));
  return out;
}

/** 오늘이 몇 번째 Day 인가. 주말·기간 밖이면 null. */
export function currentDay(day1, today) {
  const iso = toISO(today);
  for (const [n, d] of scheduleMap(day1)) if (toISO(d) === iso) return n;
  return null;
}

/** 오늘까지 공개된 마지막 Day. 아직 시작 전이면 -1. */
export function latestDay(day1, today) {
  let last = -1;
  const iso = toISO(today);
  for (const [n, d] of scheduleMap(day1)) if (toISO(d) <= iso && n > last) last = n;
  return last;
}

/** 두 날짜 사이에 낀 '퀘스트가 있는 날' 수. */
export function scheduledDaysBetween(day1, start, end) {
  const s = toISO(start);
  const e = toISO(end);
  let n = 0;
  for (const d of scheduleMap(day1).values()) {
    const iso = toISO(d);
    if (iso > s && iso <= e) n += 1;
  }
  return n;
}

/** KST 기준 오늘. Vercel 서버는 UTC로 돈다. */
export function todayKST(offsetHours = 9) {
  const now = new Date(Date.now() + offsetHours * 3600000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
