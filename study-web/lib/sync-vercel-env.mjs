/**
 * .env.local 을 Vercel 환경변수로 밀어 올린다.
 *
 *   VERCEL_TOKEN=xxx node lib/sync-vercel-env.mjs           # 뭐가 바뀔지만 보여준다
 *   VERCEL_TOKEN=xxx node lib/sync-vercel-env.mjs --apply   # 실제로 반영
 *
 * 토큰: https://vercel.com/account/tokens (웹에서 발급, 1분)
 *
 * 손으로 옮기다 생기는 복사 실수를 없애는 게 목적이다.
 * 값은 절대 출력하지 않는다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API = 'https://api.vercel.com';

const token = process.env.VERCEL_TOKEN;
const apply = process.argv.includes('--apply');
const PROJECT = process.env.VERCEL_PROJECT || 'vibe-coding-study-plan';

if (!token) {
  console.log('VERCEL_TOKEN 이 없습니다.');
  console.log('  https://vercel.com/account/tokens 에서 발급한 뒤:');
  console.log('  VERCEL_TOKEN=xxx node lib/sync-vercel-env.mjs');
  process.exit(1);
}

/** 배포에 올리면 안 되는 것들. */
const SKIP = new Set([
  // 로컬 주소다. Vercel 은 배포 주소를 알아서 감지하므로 올리면 오히려 로그인이 깨진다.
  'AUTH_URL',
]);

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) {
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (v) env[k] = v;
  }
}

async function call(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* 텍스트 응답 */
  }
  return { ok: res.ok, status: res.status, json, text };
}

// 팀 소속 프로젝트면 teamId 가 필요하다. 개인 스코프부터 시도한다.
let scope = '';
let project = await call('GET', `/v9/projects/${PROJECT}`);
if (!project.ok) {
  const teams = await call('GET', '/v2/teams');
  for (const t of teams.json?.teams ?? []) {
    const p = await call('GET', `/v9/projects/${PROJECT}?teamId=${t.id}`);
    if (p.ok) {
      project = p;
      scope = `?teamId=${t.id}`;
      console.log(`팀 스코프: ${t.name ?? t.slug}`);
      break;
    }
  }
}
if (!project.ok) {
  console.log(`프로젝트 '${PROJECT}' 를 못 찾았습니다 (${project.status}).`);
  if (project.status === 403) console.log('  토큰 권한을 확인하세요.');
  console.log('  이름이 다르면 VERCEL_PROJECT=이름 으로 지정합니다.');
  process.exit(1);
}
console.log(`프로젝트: ${project.json.name}`);

const existing = await call('GET', `/v9/projects/${PROJECT}/env${scope}`);
const byKey = new Map((existing.json?.envs ?? []).map((e) => [e.key, e]));

const TARGET = ['production', 'preview', 'development'];
const plan = [];

for (const [key, value] of Object.entries(env)) {
  if (SKIP.has(key)) {
    console.log(`  건너뜀  ${key}  (로컬 전용 — Vercel 이 배포 주소를 자동 감지합니다)`);
    continue;
  }
  const cur = byKey.get(key);
  if (!cur) plan.push({ key, value, action: 'create' });
  // 기존 값은 암호화돼서 읽을 수 없다. 항상 덮어써야 최신이 보장된다.
  else plan.push({ key, value, action: 'update', id: cur.id });
}

console.log();
for (const p of plan) {
  console.log(`  ${p.action === 'create' ? '추가' : '갱신'}  ${p.key}  (${p.value.length}자)`);
}
if (!plan.length) {
  console.log('  올릴 게 없습니다.');
  process.exit(0);
}

if (!apply) {
  console.log('\n미리보기입니다. 실제로 반영하려면 --apply 를 붙이세요.');
  process.exit(0);
}

console.log();
let ok = 0;
for (const p of plan) {
  const isPublic = p.key.startsWith('NEXT_PUBLIC_');
  const res =
    p.action === 'create'
      ? await call('POST', `/v10/projects/${PROJECT}/env${scope}`, {
          key: p.key,
          value: p.value,
          // NEXT_PUBLIC_ 은 어차피 브라우저로 나가므로 암호화가 의미 없다.
          type: isPublic ? 'plain' : 'encrypted',
          target: TARGET,
        })
      : await call('PATCH', `/v9/projects/${PROJECT}/env/${p.id}${scope}`, {
          value: p.value,
          target: TARGET,
        });

  if (res.ok) {
    console.log(`  OK    ${p.key}`);
    ok += 1;
  } else {
    console.log(`  실패  ${p.key}  (${res.status}) ${res.json?.error?.message ?? ''}`);
  }
}

console.log(`\n${ok}/${plan.length} 반영됨.`);
console.log('환경변수는 재배포해야 적용됩니다. 빈 커밋을 밀거나 Vercel 에서 Redeploy 하세요:');
console.log('  git commit --allow-empty -m "chore: 환경변수 반영" && git push');
