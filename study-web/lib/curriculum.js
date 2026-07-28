/**
 * curriculum/*.md 에서 그날 퀘스트 섹션을 떼어온다.
 *
 * 읽는 경로가 두 갈래다.
 *  1) 상위 폴더의 실제 파일 — 로컬 개발과, 빌드에 상위 폴더가 포함된 경우
 *  2) GitHub raw — Vercel 의 Root Directory 가 study-web 이라 상위가 안 보일 때
 *
 * repo 가 공개라 2번이 항상 뒤를 받쳐준다. 커리큘럼을 고치면 재배포 때 반영된다.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const RAW_BASE =
  process.env.NEXT_PUBLIC_CURRICULUM_RAW ||
  'https://raw.githubusercontent.com/newrise0410/vibe-coding-study-plan/master';

const FILES = { 0: 'curriculum/day-00-setup.md' };
for (let n = 1; n <= 5; n += 1) FILES[n] = 'curriculum/week-1.md';
for (let n = 6; n <= 10; n += 1) FILES[n] = 'curriculum/week-2.md';
for (let n = 11; n <= 15; n += 1) FILES[n] = 'curriculum/week-3.md';

export const DAY_FILES = FILES;

async function loadFile(relative) {
  // 1) 상위 폴더의 실제 파일
  try {
    return await fs.readFile(path.join(process.cwd(), '..', relative), 'utf8');
  } catch {
    /* Vercel 에서는 대개 여기로 안 온다 */
  }
  // 2) GitHub raw. 한 시간 캐시한다.
  const res = await fetch(`${RAW_BASE}/${relative}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`커리큘럼을 못 읽었습니다: ${relative} (${res.status})`);
  return res.text();
}

/** `⏱ 90분 · **이번 주에서 가장 중요한 날**` 에서 마크다운 표시를 걷어낸다. */
function extractDuration(text) {
  const m = /^⏱\s*(.+)$/m.exec(text);
  if (!m) return null;
  return m[1].replace(/\*\*/g, '').replace(/`/g, '').trim();
}

/** 다음 Day 제목이나 주차 체크포인트를 만나면 섹션이 끝난다. */
const END = /^#\s+Day\s+\d+\b|^##\s+.*체크포인트/m;

export async function daySection(day) {
  const relative = FILES[day];
  if (!relative) return null;

  const text = await loadFile(relative);
  const start = new RegExp(`^#\\s+Day\\s+${day}\\b.*$`, 'm').exec(text);
  if (!start) return null;

  const title = start[0].replace(/^#+\s*/, '').trim();
  const rest = text.slice(start.index + start[0].length);
  const end = END.exec(rest);
  let body = end ? rest.slice(0, end.index) : rest;

  // Day 사이 구분선(--- 두 줄)을 털어낸다.
  body = body.replace(/\n---\s*\n---\s*\n?/g, '\n').trim();

  return {
    day,
    title,
    body,
    duration: extractDuration(body),
    sourceUrl: `https://github.com/newrise0410/vibe-coding-study-plan/blob/master/${relative}`,
  };
}

/** 목록 화면용 — 제목과 소요 시간만. */
export async function dayHeadings() {
  const byFile = new Map();
  const out = [];
  for (let day = 0; day <= 15; day += 1) {
    const relative = FILES[day];
    if (!byFile.has(relative)) byFile.set(relative, await loadFile(relative));
    const text = byFile.get(relative);
    const m = new RegExp(`^#\\s+Day\\s+${day}\\b.*$`, 'm').exec(text);
    const title = m ? m[0].replace(/^#+\s*/, '').trim() : `Day ${day}`;
    const after = m ? text.slice(m.index) : '';
    out.push({ day, title, duration: extractDuration(after.slice(0, 400)) });
  }
  return out;
}
