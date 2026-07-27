/**
 * 구글 로그인. Day 10 의 실물이다.
 *
 * 비밀번호를 직접 받지 않는다. 해시·솔트·유출 대응·재설정 메일을 전부 안 만들어도 되고,
 * 초보자가 인증에서 실수했을 때 피해가 사용자에게 가는 걸 막는다.
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './lib/mongodb.js';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: process.env.MONGODB_DB || 'dulkkot_study',
  }),
  providers: [Google],
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
