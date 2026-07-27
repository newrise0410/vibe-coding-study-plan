/**
 * 순수 로직 검증. DB도 Discord도 없이 돈다.
 *
 *   node lib/test-logic.mjs
 */

import { DAY_FIELDS, REQUIRED, fieldsFor, requiredFor, DAYS } from './dayFields.js';
import { validateSubmission, inspect, STATE_LABEL } from './validate.js';
import { parseDate, dayToDate, currentDay, latestDay, scheduledDaysBetween, toISO } from './schedule.js';
import { buildMatrix, dayStats } from './matrix.js';
import { createHash } from 'node:crypto';
import { sign, INCOMING_TRANSFORM } from './cloudinary.js';
import { resized } from './imageUrl.js';

let fails = [];
const check = (name, cond, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) fails.push(name);
};

console.log('\n[1] Day별 폼 정의');
check('Day 0~15 전부 정의됨', DAYS.length === 16 && DAYS[0] === 0 && DAYS[15] === 15, DAYS);
check('Day 0 은 해부 칸이 없다', !fieldsFor(0).some((f) => f.key === '해부'));
check('Day 15 는 해부·부숴보기 둘 다 없다',
  !fieldsFor(15).some((f) => ['해부', '부숴보기'].includes(f.key)));
check('Day 7 은 해부가 두 칸', fieldsFor(7).filter((f) => f.key.startsWith('해부')).length === 2);
check('Day 8 은 해부가 한 칸', fieldsFor(8).filter((f) => f.key.startsWith('해부')).length === 1);
check('막혔던 것은 어디서도 필수가 아님',
  DAYS.every((d) => !requiredFor(d).includes('막혔던 것')));
check('필수 칸은 전부 그 Day에 실재하는 필드',
  DAYS.every((d) => {
    const keys = new Set(fieldsFor(d).map((f) => f.key));
    return requiredFor(d).every((k) => keys.has(k));
  }));

console.log('\n[2] 서버 검증 — 빈 칸은 못 지나간다');
const empty = validateSubmission(8, { fields: { 해부: '', 부숴보기: '없음', 답: '했어요' } });
check('거부됨', !empty.ok);
check('해부·부숴보기 둘 다 잡힘', empty.errors.해부 && empty.errors.부숴보기, empty.errors);

console.log('\n[3] 안내문 그대로 붙여넣기');
const echo = validateSubmission(2, {
  fields: { 해부: '(찾아낸 것 — 파일명과 줄 번호까지)', 부숴보기: 'B는 점을 빼니까 통째로 날아갔다', 답: 'ok' },
});
check('괄호 안내문 거부', !echo.ok && /안내문/.test(echo.errors.해부 ?? ''), echo.errors);

console.log('\n[4] 너무 짧은 답');
const short = validateSubmission(6, { fields: { 해부: '했음', 부숴보기: '함' } });
check('짧다고 거부', !short.ok && /짧/.test(short.errors.해부 ?? ''), short.errors);

console.log('\n[5] 화이트리스트 — 보내면 안 되는 값이 섞였을 때');
const inj = validateSubmission(6, {
  fields: {
    해부: 'app/api/route.js 12줄에서 JSON을 돌려준다',
    부숴보기: 'A로 소문자 get 만들었더니 405가 왔다',
    isAdmin: 'true',
    _id: 'aaa',
  },
});
check('통과는 하되', inj.ok, inj.errors);
check('isAdmin·_id 는 버려짐', !('isAdmin' in inj.value.fields) && !('_id' in inj.value.fields),
  Object.keys(inj.value.fields));

console.log('\n[6] URL 형식과 소요 시간');
const badUrl = validateSubmission(3, {
  fields: { '내 사이트': 'dulkkot.vercel.app', 해부: '요청 12개 전송량 340kB', 부숴보기: '대문자로 바꾸니 배포만 404' },
});
check('http 없는 주소 거부', !badUrl.ok && badUrl.errors['내 사이트'], badUrl.errors);
const badMin = validateSubmission(6, {
  fields: { 해부: '12줄에서 JSON 응답을 만든다', 부숴보기: '소문자 get 으로 바꾸니 405' },
  minutesSpent: 9999,
});
check('말 안 되는 소요 시간 거부', !badMin.ok && badMin.errors.minutesSpent);

console.log('\n[7] 정상 제출');
const good = validateSubmission(13, {
  fields: {
    해부: 'complete/route.js 41줄에서 금액 대조, 멱등은 58줄',
    해부2: 'Vercel 로그에 웹훅 수신 기록 확인함',
    부숴보기: 'A에서 100원으로 조작했는데 서버가 거부하고 PENDING 유지',
    '뚫린 게 있었나': 'C 가짜 웹훅이 200으로 통과해서 서명 검증 추가',
    답: '4문항 다 씀',
  },
  minutesSpent: 120,
});
check('통과', good.ok, good.errors);
check('소요 시간 보존', good.value.minutesSpent === 120);

console.log('\n[8] 일정 — 주말 건너뛰기');
const d1 = parseDate('2026-08-03'); // 월요일
check('Day 5 = 8/7 금', toISO(dayToDate(d1, 5)) === '2026-08-07', toISO(dayToDate(d1, 5)));
check('Day 6 = 8/10 월', toISO(dayToDate(d1, 6)) === '2026-08-10', toISO(dayToDate(d1, 6)));
check('Day 15 = 8/21 금', toISO(dayToDate(d1, 15)) === '2026-08-21', toISO(dayToDate(d1, 15)));
check('Day 0 = 7/31', toISO(dayToDate(d1, 0)) === '2026-07-31', toISO(dayToDate(d1, 0)));
check('토요일은 퀘스트 없음', currentDay(d1, parseDate('2026-08-08')) === null);
check('시작 전이면 latestDay = -1', latestDay(d1, parseDate('2026-07-20')) === -1);

console.log('\n[9] 이탈 판정 — 금→월은 1일이지 3일이 아니다');
check('금요일 제출 → 월요일 = 1일',
  scheduledDaysBetween(d1, parseDate('2026-08-07'), parseDate('2026-08-10')) === 1);
check('Day1 제출 → Day6 = 5일',
  scheduledDaysBetween(d1, parseDate('2026-08-03'), parseDate('2026-08-10')) === 5);

console.log('\n[10] 행렬');
const users = [
  { _id: 'u1', name: '아영', role: 'participant' },
  { _id: 'u2', name: '준호', role: 'participant' },
  { _id: 'u3', name: '운영자', role: 'admin' },
];
const subs = [
  ...[1, 2, 3, 4, 5].map((d) => ({ _id: `a${d}`, userId: 'u1', day: d, status: 'submitted', updatedAt: new Date(`2026-08-0${d + 2}T10:00:00Z`) })),
  { _id: 'b1', userId: 'u2', day: 1, status: 'returned', reviewNote: '해부가 비었어요', updatedAt: new Date('2026-08-03T10:00:00Z') },
];
const m = buildMatrix({ users, submissions: subs, day1: d1, today: parseDate('2026-08-10') });
check('관리자는 행렬에서 제외', m.rows.length === 2, m.rows.map((r) => r.name));
const ayoung = m.rows.find((r) => r.name === '아영');
const junho = m.rows.find((r) => r.name === '준호');
check('아영 5일 완료', ayoung.done === 5, ayoung.done);
check('아영은 조용하지 않음 (금→월 1일)', !ayoung.quiet, ayoung.silentFor);
check('준호는 조용함', junho.quiet && junho.silentFor === 5, junho.silentFor);
check('준호 Day1 은 되돌려보냄 표시', junho.cells.find((c) => c.day === 1).mark === '↩');
check('조용한 사람이 위로 정렬', m.rows[0].name === '준호', m.rows.map((r) => r.name));
const st = dayStats({ rows: m.rows, days: m.days });
check('Day 1 완료율 100%', st.find((s) => s.day === 1).rate === 100, st.find((s) => s.day === 1));
check('Day 6 완료율 0%', st.find((s) => s.day === 6).rate === 0);

console.log('\n[11] inspect — 운영자 화면용 칸별 진단');
const ins = inspect(8, {
  해부: '',
  부숴보기: '(무엇을 망가뜨렸더니 → 무엇이 어떻게 됐다)',
  답: '3문항 다 했습니다 전부 확인함',
  '뚫린 게 있었나': '',
});
check('해부는 blank', ins.cells.해부.state === 'blank', ins.cells.해부);
check('부숴보기는 template', ins.cells.부숴보기.state === 'template', ins.cells.부숴보기);
check('필수 약한 칸 2개', ins.weak === 2, ins.weak);
check('필수 아닌 빈 칸은 weak 에 안 셈', ins.cells['뚫린 게 있었나'].state === 'empty',
  ins.cells['뚫린 게 있었나']);
check('상태 라벨이 전부 정의됨',
  Object.values(ins.cells).every((c) => STATE_LABEL[c.state] !== undefined));

const clean = inspect(13, {
  해부: 'complete/route.js 41줄에서 금액 대조, 멱등은 58줄',
  해부2: 'Vercel 로그에 웹훅 수신 기록 확인함',
  부숴보기: 'A에서 100원으로 조작했는데 서버가 거부하고 PENDING 유지',
  '뚫린 게 있었나': 'C 가짜 웹훅이 200으로 통과해서 서명 검증 추가',
  답: '4문항 다 씀',
});
check('정상 인증은 weak 0', clean.weak === 0, clean.weak);

console.log('\n[12] Day 0 은 해부가 없으니 진단에도 안 나온다');
const d0 = inspect(0, {
  부숴보기: 'A 했더니 글씨가 작아졌다. 태그마다 기본 생김새가 있는 듯',
  답: '이미지는 용량이 커서 DB에 넣으면 느려질 것 같다',
  계정: '다 됨',
});
check('해부 칸 자체가 없음', !('해부' in d0.cells), Object.keys(d0.cells));
check('weak 0', d0.weak === 0, d0.weak);
// Day 0 의 '답'은 추측이지만 그래도 실하게 써야 한다.
check('Day 0 의 답도 짧으면 잡힌다', inspect(0, { 부숴보기: 'A 했더니 글씨가 작아졌다', 답: '몰라요' }).weak === 1);

console.log('\n[13] 스샷 — 칸별로 담기고, 우리 계정 주소만 받는다');
const CL = 'https://res.cloudinary.com/demo/image/upload/v1/dulkkot/day1/abc.jpg';
const withImg = validateSubmission(1, {
  fields: { 해부: 'link 7줄 script 24줄, head 3~9', 부숴보기: 'A와 D 둘 다 흑백인데 D는 404' },
  images: {
    스샷: [CL, 'https://evil.example.com/x.jpg', 'javascript:alert(1)'],
    해부: [CL], // 이미지 칸이 아니다
    없는칸: [CL],
  },
});
check('통과', withImg.ok, withImg.errors);
check('우리 Cloudinary 주소만 남음', withImg.value.images.스샷.length === 1, withImg.value.images.스샷);
check('이미지 칸이 아닌 곳은 버림', !('해부' in withImg.value.images));
check('그 Day 에 없는 칸도 버림', !('없는칸' in withImg.value.images));

const many = validateSubmission(1, {
  fields: { 해부: 'link 7줄 script 24줄, head 3~9', 부숴보기: 'A와 D 둘 다 흑백인데 D는 404' },
  images: { 스샷: Array.from({ length: 20 }, (_, i) => `${CL}?${i}`.replace('?', '/v') ) },
});
check('장수 상한 적용', many.value.images.스샷.length <= 6, many.value.images.스샷.length);

console.log('\n[14] Cloudinary 서명 — 규칙대로 만들어지나');
const signature = sign({ folder: 'dulkkot/day1/u1', timestamp: 1700000000, transformation: 'c_limit,w_1600,q_auto' }, 'SECRET');
// 문서 규칙: 이름순 정렬 → key=value&... → 끝에 secret → sha1
const expected = createHash('sha1')
  .update('folder=dulkkot/day1/u1&timestamp=1700000000&transformation=c_limit,w_1600,q_auto' + 'SECRET')
  .digest('hex');
check('sha1 이 규칙과 일치', signature === expected, signature);
check('파라미터 순서가 달라도 같은 서명',
  sign({ timestamp: 1700000000, transformation: 'c_limit,w_1600,q_auto', folder: 'dulkkot/day1/u1' }, 'SECRET') === expected);
check('secret 이 바뀌면 서명도 바뀜',
  sign({ folder: 'a', timestamp: 1 }, 'X') !== sign({ folder: 'a', timestamp: 1 }, 'Y'));
check('업로드 시 폭 제한이 걸려 있음', INCOMING_TRANSFORM.includes('w_1600'));
check('URL 옵션으로 축소본을 만든다',
  resized(CL) === 'https://res.cloudinary.com/demo/image/upload/w_320,q_auto,f_auto/v1/dulkkot/day1/abc.jpg',
  resized(CL));

console.log();
if (fails.length) {
  console.log(`실패 ${fails.length}건: ${fails.join(', ')}`);
  process.exit(1);
}
console.log('전부 통과');
