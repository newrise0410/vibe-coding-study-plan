import { redirect } from 'next/navigation';
import { auth, signIn, emailEnabled } from '../../auth.js';

export const dynamic = 'force-dynamic';

const ERRORS = {
  Verification: '링크가 만료됐거나 이미 쓴 링크입니다. 메일 주소를 다시 넣어주세요.',
  OAuthAccountNotLinked: '같은 메일이 다른 방식으로 이미 가입돼 있습니다. 처음 쓰신 방법으로 로그인해주세요.',
  EmailSignin: '메일을 보내지 못했습니다. 주소를 확인하시고, 계속 안 되면 운영자에게 알려주세요.',
  Default: '로그인에 실패했습니다. 다시 시도해주세요.',
};

export default async function LoginPage({ searchParams }) {
  const session = await auth();
  if (session?.user) redirect('/me');

  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.Default) : null;

  return (
    <main className="wrap narrow">
      <nav className="crumb">
        <a href="/">← 스터디 소개</a>
      </nav>

      <h1>들꽃 스터디</h1>
      <p className="lead">
        퀘스트를 보고 인증을 냅니다.
        <br />
        <b>처음이면 그대로 가입됩니다.</b> 따로 회원가입 절차가 없습니다.
      </p>

      {message && <p className="err banner">{message}</p>}

      {emailEnabled ? (
        <form
          className="form"
          action={async (formData) => {
            'use server';
            await signIn('nodemailer', {
              email: String(formData.get('email') ?? '').trim(),
              redirectTo: '/me',
            });
          }}
        >
          <div className="field">
            <label htmlFor="email">메일 주소</label>
            <p className="hint">이 주소로 로그인 링크를 보냅니다. 비밀번호는 없습니다</p>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit">로그인 링크 받기</button>
        </form>
      ) : (
        <p className="note">메일 로그인은 아직 설정 전입니다. 아래 구글 로그인을 써주세요.</p>
      )}

      <div className="or">
        <span>또는</span>
      </div>

      <form
        action={async () => {
          'use server';
          await signIn('google', { redirectTo: '/me' });
        }}
      >
        <button type="submit" className="secondary">
          구글로 계속하기
        </button>
      </form>

      <p className="note" style={{ marginTop: 28 }}>
        어느 쪽도 <b>비밀번호를 받지 않습니다.</b> 메일 링크는 주소가 본인 것인지만 확인하고,
        구글은 구글에게 신원만 물어봅니다.
        <br />
        Day 10에서 이 구조를 직접 해부합니다.
      </p>
    </main>
  );
}
