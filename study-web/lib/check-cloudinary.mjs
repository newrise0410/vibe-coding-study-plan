/**
 * Cloudinary 점검. 자격증명이 맞는지, 서명 업로드가 실제로 되는지까지 본다.
 *
 *   node lib/check-cloudinary.mjs
 *
 * Day 9 에서 가장 많이 막히는 건 '서명 파라미터 불일치' 인데, 그건 401 로만 오고
 * 이유를 안 알려준다. 그래서 진짜 업로드를 한 번 해보고 지운다.
 *
 * 별도 패키지 없이 Admin API 를 직접 쓴다. 값은 절대 출력하지 않는다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sign, INCOMING_TRANSFORM } from './cloudinary.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const cloud = env.CLOUDINARY_CLOUD_NAME;
const key = env.CLOUDINARY_API_KEY;
const secret = env.CLOUDINARY_API_SECRET;
const pub = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const missing = [
  ['CLOUDINARY_CLOUD_NAME', cloud],
  ['CLOUDINARY_API_KEY', key],
  ['CLOUDINARY_API_SECRET', secret],
  ['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', pub],
].filter(([, v]) => !v);

if (missing.length) {
  console.log('아직 설정 안 됨. .env.local 에 채우세요:');
  for (const [k] of missing) console.log(`  ${k}`);
  console.log('\nhttps://cloudinary.com → Dashboard 상단에서 세 값을 복사합니다.');
  console.log('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 은 CLOUDINARY_CLOUD_NAME 과 같은 값입니다.');
  process.exit(1);
}

if (pub !== cloud) {
  console.log('!! NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 이 CLOUDINARY_CLOUD_NAME 과 다릅니다.');
  console.log('   같은 값이어야 합니다. 앞의 것은 브라우저용, 뒤의 것은 서버용입니다.');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
const base = `https://api.cloudinary.com/v1_1/${cloud}`;

// 1. 자격증명 확인
const ping = await fetch(`${base}/ping`, { headers: { Authorization: auth } });
if (!ping.ok) {
  console.log(`자격증명 실패 (${ping.status})`);
  if (ping.status === 401) console.log('  API Key 또는 API Secret 이 틀립니다.');
  if (ping.status === 404) console.log('  Cloud name 이 틀립니다.');
  process.exit(1);
}
console.log('자격증명 정상');

// 2. 남은 용량
try {
  const u = await (await fetch(`${base}/usage`, { headers: { Authorization: auth } })).json();
  const credits = u?.credits;
  if (credits) {
    console.log(
      `크레딧 ${Number(credits.usage ?? 0).toFixed(2)} / ${credits.limit} ` +
        `(${Number(credits.used_percent ?? 0).toFixed(1)}% 사용)`,
    );
  }
} catch {
  /* 용량 조회 실패는 치명적이지 않다 */
}

// 3. 서명 업로드를 진짜 해본다. 여기가 Day 9 의 실제 병목이다.
const timestamp = Math.round(Date.now() / 1000);
const folder = 'dulkkot/_check';
const params = { folder, timestamp, transformation: INCOMING_TRANSFORM };
const signature = sign(params, secret);

// 1x1 투명 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const fd = new FormData();
fd.append('file', new Blob([png], { type: 'image/png' }), 'probe.png');
fd.append('api_key', key);
fd.append('timestamp', String(timestamp));
fd.append('signature', signature);
fd.append('folder', folder);
fd.append('transformation', INCOMING_TRANSFORM);

const up = await fetch(`${base}/image/upload`, { method: 'POST', body: fd });
const result = await up.json();

if (!up.ok) {
  console.log(`\n서명 업로드 실패 (${up.status}): ${result?.error?.message ?? ''}`);
  console.log('  서명에 넣은 파라미터와 업로드할 때 보낸 파라미터가 정확히 같아야 합니다.');
  console.log('  하나라도 다르면 401 이 옵니다 — Day 9 에서 가장 많이 막히는 지점입니다.');
  process.exit(1);
}

console.log('서명 업로드 성공');
console.log(`  올라온 크기: ${result.width}x${result.height} (${INCOMING_TRANSFORM} 적용됨)`);

// 4. 치운다
const del = await fetch(
  `${base}/resources/image/upload?public_ids[]=${encodeURIComponent(result.public_id)}`,
  { method: 'DELETE', headers: { Authorization: auth } },
);
console.log(del.ok ? '  테스트 이미지 삭제됨' : '  !! 테스트 이미지 삭제 실패 — 콘솔에서 지우세요');

console.log('\n전부 준비됨. Vercel 환경변수에도 네 개를 넣고 재배포하세요.');
