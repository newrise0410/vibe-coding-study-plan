import { redirect } from 'next/navigation';
import { auth, signIn } from '../auth.js';

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect('/me');

  return (
    <main className="wrap">
      <h1>들꽃 스터디</h1>
      <p className="lead">
        15일 뒤에 로그인하고, 상품을 등록하고, 이미지를 올리고, 카드로 결제되는 사이트가 인터넷에 있습니다.
        그건 AI만 잘 시켜도 어느 정도 됩니다. 이 스터디가 노리는 건 그다음입니다 —
        <strong> AI가 알아서 다 해줘도, 그 안에서 무슨 일이 일어난 건지 아는 것.</strong>
      </p>

      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/me' });
        }}
      >
        <button type="submit">구글로 로그인</button>
      </form>

      <p className="note" style={{ marginTop: 20 }}>
        비밀번호는 받지 않습니다. 구글에게 신원만 물어봅니다. Day 10에서 이 구조를 직접 해부합니다.
      </p>
    </main>
  );
}
