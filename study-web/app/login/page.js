import { redirect } from 'next/navigation';
import { auth, signIn } from '../../auth.js';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/me');

  return (
    <main className="wrap narrow">
      <nav className="crumb">
        <a href="/">← 스터디 소개</a>
      </nav>

      <h1>들꽃 스터디</h1>
      <p className="lead">참가자용 로그인입니다. 퀘스트를 보고 인증을 냅니다.</p>

      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/me' });
        }}
      >
        <button type="submit">구글로 로그인</button>
      </form>

      <p className="note" style={{ marginTop: 20 }}>
        비밀번호는 받지 않습니다. 구글에게 신원만 물어봅니다.
        <br />
        Day 10에서 이 구조를 직접 해부합니다.
      </p>
    </main>
  );
}
