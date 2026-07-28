/**
 * MongoDB 연결 점검. Auth.js 는 어댑터 실패도 'Configuration' 으로 뭉뚱그려서
 * 진짜 원인이 안 보인다. 그래서 연결만 따로 떼어 확인한다.
 *
 *   node lib/check-db.mjs
 *
 * 에러 메시지에 접속 문자열이 섞여 나오므로 출력 전에 가린다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const uri = env.MONGODB_URI;
const dbName = env.MONGODB_DB || 'dulkkot_study';

/** 비밀번호·호스트가 로그로 새지 않게 가린다. */
function redact(text) {
  return String(text)
    .replace(/mongodb(\+srv)?:\/\/[^\s"']+/g, 'mongodb+srv://***')
    .replace(/\/\/[^:@\s]+:[^@\s]+@/g, '//***:***@');
}

if (!uri) {
  console.log('MONGODB_URI 가 없습니다.');
  process.exit(1);
}

// 접속 문자열 자체의 흔한 실수부터 본다.
const afterScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
const at = afterScheme.lastIndexOf('@');
if (at < 0) {
  console.log('아이디:비밀번호 부분이 없습니다. Atlas → Connect → Drivers 문자열을 다시 복사하세요.');
  process.exit(1);
}
const cred = afterScheme.slice(0, at);
const colon = cred.indexOf(':');
const pw = colon >= 0 ? cred.slice(colon + 1) : '';

if (pw.includes('<') || pw.includes('>')) {
  console.log('비밀번호가 아직 <password> 자리표시자 그대로입니다. 실제 비밀번호로 바꾸세요.');
  process.exit(1);
}
const risky = [...'@:/?#&[]'].filter((c) => pw.includes(c));
if (risky.length) {
  console.log(`비밀번호에 URL 인코딩이 필요한 문자가 있습니다: ${risky.join(' ')}`);
  console.log('Atlas → Database Access 에서 영문+숫자로만 재설정하는 게 가장 빠릅니다.\n');
}

console.log(`접속 시도… (DB: ${dbName})`);
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log('연결 성공');

  const cols = await db.listCollections().toArray();
  console.log(`컬렉션 ${cols.length}개: ${cols.map((c) => c.name).join(', ') || '(아직 없음)'}`);

  // 읽기만 되는 계정이면 여기서 걸린다.
  // 로그인할 때 Auth.js 가 users 를 만들어야 하는데, 읽기 전용이면 그 순간 터진다.
  // 화면에는 그냥 'Server error' 로만 보여서 원인을 찾기 어렵다.
  try {
    const probe = db.collection('_write_probe');
    const r = await probe.insertOne({ at: new Date() });
    await probe.deleteOne({ _id: r.insertedId });
    // 컬렉션 자체도 치운다. 안 그러면 Atlas 화면에 계속 남는다.
    await probe.drop().catch(() => {});
    console.log('쓰기 권한 있음');
  } catch (e) {
    const m = redact(e?.message ?? e);
    console.log(`\n!! 쓰기 실패: ${m}`);
    console.log('  Atlas → Database Access → 그 사용자 → Edit →');
    console.log("  권한을 'Read and write to any database' 로 바꾸세요.");
    console.log('  읽기 전용이면 로그인할 때 사용자 문서를 못 만들어서 로그인이 통째로 실패합니다.');
    process.exit(1);
  }

  const users = await db.collection('users').countDocuments();
  console.log(`users 문서 ${users}개`);
  if (users > 0) {
    const admins = await db.collection('users').countDocuments({ role: 'admin' });
    console.log(`그중 role='admin' 인 사람 ${admins}명`);
    if (admins === 0) {
      console.log("  → /admin 을 열려면 Atlas 에서 내 문서의 role 을 'admin' 으로 바꿔야 합니다.");
    }
  }
  process.exit(0);
} catch (e) {
  const msg = redact(e?.message ?? e);
  console.log(`\n연결 실패: ${msg}\n`);

  if (/SSL|TLS|alert number 80|ssl3_read_bytes/i.test(msg)) {
    // Atlas 는 허용되지 않은 IP 를 TLS 핸드셰이크 단계에서 끊는다.
    // 접속 문자열이나 비밀번호 문제가 아니다.
    console.log('Atlas 가 TLS 단계에서 연결을 끊었습니다. 거의 항상 IP 문제입니다.');
    console.log('');
    console.log('  Atlas → Network Access 를 열고 확인하세요:');
    console.log('    1. 0.0.0.0/0 항목이 있나');
    console.log("    2. 상태가 Active 인가 (Pending 이면 1~2분 기다린다)");
    console.log('    3. 만료 시간이 걸려 있지 않나');
    console.log('       — "temporary access" 로 추가하면 6시간 뒤 자동으로 사라진다');
    console.log('    4. 내 IP 만 넣어뒀다면, IP 가 바뀌었을 수 있다');
    console.log('');
    console.log('  Day 7 부숴보기 실험으로 0.0.0.0/0 을 지웠다면 되돌리세요.');
    console.log('  클러스터가 Paused 상태인지도 함께 확인합니다.');
  } else if (/Authentication failed|bad auth/i.test(msg)) {
    console.log('아이디 또는 비밀번호가 틀립니다.');
    console.log('  Atlas 계정 비밀번호가 아니라 **Database Access 의 DB 사용자** 비밀번호입니다.');
  } else if (/ENOTFOUND|querySrv|getaddrinfo/i.test(msg)) {
    console.log('클러스터 주소를 못 찾습니다. 문자열을 잘못 복사했거나 클러스터가 지워졌습니다.');
  } else if (/timed out|ETIMEDOUT|ServerSelection/i.test(msg)) {
    console.log('접속은 되는데 응답이 없습니다. Atlas → Network Access 에 0.0.0.0/0 이 있는지 보세요.');
  }
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
