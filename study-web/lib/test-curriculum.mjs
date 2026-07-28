/**
 * 커리큘럼 로더 검증.
 *
 *   node lib/test-curriculum.mjs          # 로컬 파일 경로
 *   node lib/test-curriculum.mjs --remote # GitHub raw 경로 (Vercel 이 쓰는 길)
 *
 * --remote 는 cwd 를 상위 폴더가 없는 곳으로 옮겨 fallback 을 강제한다.
 */

import os from 'node:os';
import { daySection, dayHeadings } from './curriculum.js';

const remote = process.argv.includes('--remote');
if (remote) {
  // 여기서는 ../curriculum 이 없으므로 GitHub raw 로 떨어진다.
  process.chdir(os.tmpdir());
  console.log(`cwd → ${process.cwd()} (상위에 curriculum 없음 → GitHub raw 사용)\n`);
}

let fails = 0;
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) fails += 1;
};

console.log(remote ? '[GitHub raw]' : '[로컬 파일]');

for (const day of [0, 1, 5, 8, 13, 15]) {
  const s = await daySection(day);
  const ok =
    s &&
    s.title.includes(`Day ${day}`) &&
    s.body.length > 1500 &&
    !/^#\s+Day\s+\d+/m.test(s.body) && // 다음 Day 가 섞여 들어오면 안 된다
    !/체크포인트/.test(s.body.slice(-200));
  check(
    `Day ${String(day).padStart(2)}  ${String(s?.body.length ?? 0).padStart(5)}자  ⏱${s?.duration ?? '-'}`,
    ok,
    s ? s.title : 'null',
  );
}

const h = await dayHeadings();
check('목록 16개', h.length === 16, h.length);
check('제목 전부 추출됨', h.every((x) => !/^Day \d+$/.test(x.title)), h.filter((x) => /^Day \d+$/.test(x.title)));
check('소요 시간에 마크다운 안 섞임', h.every((x) => !x.duration || !x.duration.includes('**')),
  h.filter((x) => x.duration?.includes('**')).map((x) => x.duration));

// 인증 폼이 있는 Day 는 전부 섹션이 있어야 한다
const { DAY_FIELDS } = await import('./dayFields.js');
const missing = [];
for (const day of Object.keys(DAY_FIELDS).map(Number)) {
  if (!(await daySection(day))) missing.push(day);
}
check('인증 폼이 있는 Day 는 전부 퀘스트 본문이 있다', missing.length === 0, missing);

console.log();
if (fails) {
  console.log(`실패 ${fails}건`);
  process.exit(1);
}
console.log('전부 통과');
