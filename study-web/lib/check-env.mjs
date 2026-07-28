/**
 * .env.local 점검. 값은 절대 출력하지 않는다.
 *
 *   node lib/check-env.mjs
 *
 * 오타 난 키를 잡는 게 핵심이다. 이름이 하나만 달라도 조용히 빈 값이 되고,
 * 에러는 한참 뒤 엉뚱한 곳에서 난다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FILE = path.join(ROOT, '.env.local');

const REQUIRED = {
  MONGODB_URI: 'Atlas 연결 문자열 (Day 7)',
  AUTH_SECRET: '세션 서명용. npx auth secret 이 아니라 아래 명령으로 만든다 (Day 10)',
  AUTH_GOOGLE_ID: '구글 OAuth 클라이언트 ID (Day 10)',
  AUTH_GOOGLE_SECRET: '구글 OAuth 클라이언트 Secret (Day 10)',
};

const OPTIONAL = {
  MONGODB_DB: '기본값 dulkkot_study',
  AUTH_URL: '로컬은 http://localhost:3000. Vercel 에서는 자동 감지',
  STUDY_DAY1_DATE: 'Day 1 날짜. 없으면 2026-08-03',
  DISCORD_WEBHOOK_URL: '제출 알림. 없으면 알림만 안 감',
  CLOUDINARY_CLOUD_NAME: '스샷 업로드 (Day 9)',
  CLOUDINARY_API_KEY: '스샷 업로드 (Day 9)',
  CLOUDINARY_API_SECRET: '스샷 업로드 (Day 9)',
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: '스샷 업로드 (Day 9)',
  NEXT_PUBLIC_CURRICULUM_URL: '퀘스트 링크가 가리킬 GitHub 주소',
  EMAIL_HOST: '메일 로그인 (Day 10). 넷 다 있어야 켜진다',
  EMAIL_PORT: '기본 587',
  EMAIL_USER: '메일 로그인',
  EMAIL_PASS: '메일 로그인. Gmail 이면 앱 비밀번호',
  EMAIL_FROM: '메일 로그인. 보내는 사람 표시',
};

const EMAIL_KEYS = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];

const GEN = `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`;

if (!fs.existsSync(FILE)) {
  console.log('.env.local 이 없습니다.\n  cp .env.local.example .env.local');
  process.exit(1);
}

const found = new Map();
const dups = [];
for (const line of fs.readFileSync(FILE, 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 0) continue;
  const key = t.slice(0, eq).trim();
  const value = t.slice(eq + 1).trim();
  if (found.has(key)) dups.push(key);
  found.set(key, value);
}

let bad = 0;

console.log('\n필수');
for (const [key, why] of Object.entries(REQUIRED)) {
  const v = found.get(key);
  if (v) {
    console.log(`  OK    ${key}  (${v.length}자)`);
  } else {
    bad += 1;
    console.log(`  없음  ${key}  — ${why}`);
  }
}

console.log('\n선택');
for (const key of Object.keys(OPTIONAL)) {
  const v = found.get(key);
  console.log(`  ${v ? 'OK   ' : '  -  '} ${key}${v ? `  (${v.length}자)` : ''}`);
}

// 오타 난 키. BETTER_AUTH_SECRET 처럼 비슷하지만 다른 이름이 여기 걸린다.
const known = new Set([...Object.keys(REQUIRED), ...Object.keys(OPTIONAL)]);
const unknown = [...found.keys()].filter((k) => !known.has(k));
if (unknown.length) {
  console.log('\n모르는 키 — 오타이거나 안 쓰는 값입니다');
  for (const k of unknown) console.log(`  ?     ${k}`);
}

if (dups.length) {
  bad += 1;
  console.log(`\n중복된 키 (앞의 것이 이깁니다): ${[...new Set(dups)].join(', ')}`);
}

if (found.get('MONGODB_URI') && !/^mongodb(\+srv)?:\/\//.test(found.get('MONGODB_URI'))) {
  bad += 1;
  console.log('\nMONGODB_URI 가 mongodb:// 또는 mongodb+srv:// 로 시작하지 않습니다');
}

// 메일 로그인은 넷을 다 채우거나 다 비워야 한다. 일부만 있으면 조용히 안 켜진다.
const emailSet = EMAIL_KEYS.filter((k) => found.get(k));
if (emailSet.length && emailSet.length < EMAIL_KEYS.length) {
  bad += 1;
  const miss = EMAIL_KEYS.filter((k) => !found.get(k)).join(', ');
  console.log(`\n메일 로그인이 반만 설정됐습니다. 빠진 것: ${miss}`);
  console.log('  넷을 다 채우거나 다 비우세요. 지금 상태면 메일 로그인이 조용히 꺼집니다.');
} else if (emailSet.length === EMAIL_KEYS.length) {
  console.log('\n메일 로그인: 켜짐');
} else {
  console.log('\n메일 로그인: 꺼짐 (구글 로그인만 뜹니다)');
}

console.log();
if (bad) {
  console.log(`채워야 할 것 ${bad}개. AUTH_SECRET 은 이 명령으로 만듭니다:\n  ${GEN}`);
  process.exit(1);
}
console.log('전부 준비됨. npm run dev 로 띄우세요.');
