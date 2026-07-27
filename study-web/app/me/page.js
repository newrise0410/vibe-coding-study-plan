import { redirect } from 'next/navigation';
import { auth } from '../../auth.js';
import { collections } from '../../lib/mongodb.js';
import { DAYS } from '../../lib/dayFields.js';
import { parseDate, todayKST, latestDay } from '../../lib/schedule.js';

export const dynamic = 'force-dynamic';

const BADGES = [
  { mark: '🌱', name: '새싹', span: [1, 5], desc: '내 사이트가 인터넷에 있고 왜 뜨는지 안다' },
  { mark: '🌿', name: '줄기', span: [6, 10], desc: '데이터가 저장되고 로그인이 된다' },
  { mark: '🌳', name: '나무', span: [11, 15], desc: '결제까지 도는 서비스가 있다' },
];

export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const { submissions } = await collections();
  const mine = await submissions
    .find({ userId: session.user.id })
    .project({ revisions: 0 })
    .toArray();

  const byDay = new Map(mine.map((s) => [s.day, s]));
  const openDay = latestDay(parseDate(process.env.STUDY_DAY1_DATE || '2026-08-03'), todayKST());
  const returned = mine.filter((s) => s.status === 'returned');

  return (
    <main className="wrap">
      <h1>{session.user.name}님의 진행 상황</h1>
      <p className="lead">
        {mine.length} / 16일 완료
        {session.user.role === 'admin' && <> · <a href="/admin">운영 대시보드</a></>}
      </p>

      {returned.length > 0 && (
        <section className="card returned">
          <h2>다시 내야 할 인증</h2>
          <ul>
            {returned.map((s) => (
              <li key={s.day}>
                <a href={`/submit/${s.day}`}>Day {s.day}</a> — {s.reviewNote}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>뱃지</h2>
        <ul>
          {BADGES.map((b) => {
            const got = Array.from(
              { length: b.span[1] - b.span[0] + 1 },
              (_, i) => b.span[0] + i,
            ).every((d) => byDay.has(d));
            return (
              <li key={b.name} style={{ opacity: got ? 1 : 0.4 }}>
                {b.mark} <strong>{b.name}</strong> — {b.desc} {got && '✓'}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2>15일 지도</h2>
        <ul>
          {DAYS.map((d) => {
            const s = byDay.get(d);
            const open = d <= openDay;
            return (
              <li key={d}>
                Day {d} —{' '}
                {s ? (
                  <>
                    <a href={`/submit/${d}`}>{s.status === 'returned' ? '되돌려받음' : '완료'}</a>
                    {s.minutesSpent ? ` (${s.minutesSpent}분)` : ''}
                  </>
                ) : open ? (
                  <a href={`/submit/${d}`}>인증하기</a>
                ) : (
                  <span className="note">아직</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
