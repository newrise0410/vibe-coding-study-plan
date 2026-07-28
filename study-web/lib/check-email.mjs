/**
 * 메일 로그인 점검. 실제로 한 통 보내본다.
 *
 *   node lib/check-email.mjs           # 설정만 확인
 *   node lib/check-email.mjs --send    # 나에게 테스트 메일 발송
 *
 * SMTP 는 조용히 실패한다. 설정이 맞아 보여도 계정 정책에 막히는 경우가 많아서,
 * 실제로 한 통 보내보기 전에는 됐다고 말할 수 없다.
 *
 * 값은 절대 출력하지 않는다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const { EMAIL_HOST: host, EMAIL_USER: user, EMAIL_PASS: pass, EMAIL_FROM: from } = env;
const port = Number(env.EMAIL_PORT ?? 587);

const missing = [
  ['EMAIL_HOST', host],
  ['EMAIL_USER', user],
  ['EMAIL_PASS', pass],
  ['EMAIL_FROM', from],
].filter(([, v]) => !v);

if (missing.length) {
  console.log('메일 로그인이 꺼져 있습니다. 빠진 것:');
  for (const [k] of missing) console.log(`  ${k}`);
  console.log('\n넷을 다 채워야 켜집니다. 하나라도 비면 구글 로그인만 뜹니다.');
  process.exit(1);
}

// Gmail 앱 비밀번호는 화면에 `xxxx xxxx xxxx xxxx` 로 보여서 공백째 복사되기 쉽다.
const clean = pass.replace(/\s+/g, '');
if (clean !== pass) {
  console.log(`EMAIL_PASS 에 공백이 있습니다 (${pass.length}자 → ${clean.length}자).`);
  console.log('  대부분 통과하지만, 실패하면 .env.local 에서 공백을 지우세요.\n');
}
if (clean.length !== 16 && /gmail/i.test(host)) {
  console.log(`EMAIL_PASS 가 ${clean.length}자입니다. Gmail 앱 비밀번호는 보통 16자입니다.`);
  console.log('  일반 계정 비밀번호를 넣으셨다면 안 됩니다.\n');
}

// EMAIL_FROM 은 `이름 <주소>` 형태여야 한다.
const addr = /<([^>]+)>/.exec(from)?.[1] ?? from;
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
  console.log(`EMAIL_FROM 에서 주소를 못 읽었습니다. \`이름 <you@example.com>\` 형태로 넣으세요.`);
  process.exit(1);
}

console.log(`서버   ${host}:${port}`);
console.log(`보내는 사람  ${addr.replace(/^(.{2})[^@]*/, '$1***')}`);

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass: clean },
});

try {
  await transport.verify();
  console.log('\n연결·인증 성공');
} catch (e) {
  const m = String(e?.message ?? e);
  console.log(`\n실패: ${m}`);
  if (/Invalid login|535|BadCredentials/i.test(m)) {
    console.log('  아이디 또는 비밀번호가 틀립니다.');
    console.log('  Gmail 이면 일반 비밀번호가 아니라 **앱 비밀번호**여야 합니다.');
    console.log('  2단계 인증을 먼저 켜야 앱 비밀번호를 만들 수 있습니다.');
    console.log('  https://myaccount.google.com/apppasswords');
  } else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(m)) {
    console.log('  서버에 못 붙었습니다. EMAIL_HOST 와 EMAIL_PORT 를 확인하세요.');
  }
  process.exit(1);
}

if (!process.argv.includes('--send')) {
  console.log('\n실제로 한 통 보내보려면: node lib/check-email.mjs --send');
  process.exit(0);
}

try {
  const info = await transport.sendMail({
    from,
    to: addr,
    subject: '[들꽃 스터디] 메일 로그인 테스트',
    text:
      '이 메일이 보이면 메일 로그인 설정이 끝난 것입니다.\n\n' +
      '참가자는 로그인 화면에 주소를 넣으면 이런 메일로 로그인 링크를 받게 됩니다.\n' +
      '링크는 30분 동안만 유효합니다.\n',
  });
  console.log(`\n발송 성공 (${info.messageId})`);
  console.log('  받은편지함을 확인하세요. 안 보이면 스팸함도 봅니다.');
  console.log('  스팸으로 갔다면 참가자들도 그럴 수 있으니 로그인 화면 안내에 그 말을 넣어두세요.');
} catch (e) {
  console.log(`\n발송 실패: ${String(e?.message ?? e)}`);
  process.exit(1);
}
