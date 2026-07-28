import { auth, signOut } from '../auth.js';

/** 로그인한 사람에게만 보이는 상단 바. 누구로 들어와 있는지와 로그아웃. */
export default async function SessionBar() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="sessionbar">
      <div className="inner">
        <a href="/me" className="who">
          {session.user.name ?? session.user.email}
          {session.user.role === 'admin' && <b> · 운영자</b>}
        </a>
        <nav>
          <a href="/quest">퀘스트</a>
          {session.user.role === 'admin' && <a href="/admin">대시보드</a>}
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button type="submit">로그아웃</button>
          </form>
        </nav>
      </div>
    </div>
  );
}
