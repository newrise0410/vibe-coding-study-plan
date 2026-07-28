/**
 * 로그인. Day 10 의 실물이다.
 *
 * 두 가지를 함께 둔다.
 *  - 메일 링크(매직 링크): 주소만 받는다. 가입과 로그인이 같은 흐름이다
 *  - 구글: 쓰던 사람은 그대로
 *
 * 어느 쪽도 **비밀번호를 직접 다루지 않는다.** 해시·솔트·유출 대응·재설정 메일을
 * 안 만들어도 되고, 초보자가 인증에서 실수했을 때 피해가 사용자에게 가는 걸 막는다.
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Nodemailer from 'next-auth/providers/nodemailer';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './lib/mongodb.js';

/** 메일 설정이 없으면 메일 로그인을 끈다. 설정 전에도 배포가 깨지지 않게. */
export const emailEnabled = Boolean(
  process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_FROM,
);

const providers = [
  Google({
    // 쿠키가 남아 있으면 계정 선택 없이 그냥 들어가진다.
    // 누구로 들어가는지 매번 보이게 계정 선택 화면을 강제한다.
    authorization: { params: { prompt: 'select_account' } },
  }),
];

if (emailEnabled) {
  providers.push(
    Nodemailer({
      // URL 한 줄로 쓰면 비밀번호의 특수문자를 인코딩해야 한다.
      // Atlas 접속 문자열에서 이미 한 번 데인 부분이라 객체로 나눠 받는다.
      server: {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT ?? 587),
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      },
      from: process.env.EMAIL_FROM,
      // 링크 유효 시간. 기본 24시간은 너무 길다.
      maxAge: 30 * 60,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB || 'dulkkot_study',
  }),
  providers,
  // Vercel 에서는 자동 감지되지만, 명시해두지 않으면 다른 호스트에 올렸을 때
  // UntrustedHost 로 로그인이 통째로 막힌다. 첫 배포에서 헤매기 딱 좋은 지점이다.
  trustHost: true,
  pages: {
    signIn: '/login',
    verifyRequest: '/login/check',
    error: '/login',
  },
  callbacks: {
    async session({ session, user }) {
      // role 은 Atlas 에서 직접 'admin' 으로 바꾼다. 화면으로 승격시키지 않는다.
      session.user.id = user.id;
      session.user.role = user.role ?? 'participant';
      return session;
    },
  },
});

/**
 * 권한 검사는 반드시 서버에서 한다.
 *
 * 화면에서 관리자 메뉴를 숨기는 건 보안이 아니다. 주소를 직접 치거나 콘솔에서
 * fetch 로 API 를 부르면 그만이다. 그래서 API 라우트마다 이걸 부른다.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { error: { status: 401, message: '로그인이 필요합니다' }, user: null };
  }
  return { error: null, user: session.user };
}

export async function requireAdmin() {
  const { error, user } = await requireUser();
  if (error) return { error, user: null };
  if (user.role !== 'admin') {
    // 401(누구냐)과 403(해도 되냐)을 구분한다.
    return { error: { status: 403, message: '관리자만 볼 수 있습니다' }, user: null };
  }
  return { error: null, user };
}
