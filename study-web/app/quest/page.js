import { redirect } from 'next/navigation';
import { auth } from '../../auth.js';
import { collections } from '../../lib/mongodb.js';
import { dayHeadings } from '../../lib/curriculum.js';
import { parseDate, todayKST, dayToDate, latestDay, toISO } from '../../lib/schedule.js';

export const dynamic = 'force-dynamic';

const W = ['일', '월', '화', '수', '목', '금', '토'];
const BADGE = { 3: '🌱', 10: '🌿', 15: '🌳' };
const WEEK = { 1: '1주차 · 브라우저', 6: '2주차 · 서버와 데이터', 11: '3주차 · 상거래와 운영' };

export default async function QuestIndex() {
  const session = await auth();
  if (!session?.user) redirect('/');

  const [days, { submissions }] = await Promise.all([dayHeadings(), collections()]);
  const mine = await submissions
    .find({ userId: session.user.id })
    .project({ day: 1, status: 1 })
    .toArray();
  const byDay = new Map(mine.map((s) => [s.day, s.status]));

  const day1 = parseDate(process.env.STUDY_DAY1_DATE || '2026-08-03');
  const today = todayKST();
  const openDay = latestDay(day1, today);

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/me">← 내 진행 상황</a>
      </nav>

      <h1>15일 지도</h1>
      <p className="lead">
        {openDay < 0
          ? `아직 시작 전 · Day 1은 ${(() => {
              const d = dayToDate(day1, 1);
              return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
            })()}`
          : `오늘까지 Day ${openDay} 공개 · ${mine.length}일 완료`}
      </p>

      <ol className="daylist">
        {days.map(({ day, title, duration }) => {
          const when = dayToDate(day1, day);
          const open = day <= openDay;
          const isToday = toISO(when) === toISO(today);
          const status = byDay.get(day);
          return (
            <li key={day}>
              {WEEK[day] && <h2>{WEEK[day]}</h2>}
              <a className={`dayrow${isToday ? ' today' : ''}${open ? '' : ' locked'}`} href={`/quest/${day}`}>
                <span className="num">
                  {day}
                  {BADGE[day] && <em>{BADGE[day]}</em>}
                </span>
                <span className="ttl">{title.replace(/^Day\s*\d+\s*[·—-]\s*/, '')}</span>
                <span className="meta">
                  {status === 'returned' ? (
                    <b className="ret">되돌려받음</b>
                  ) : status ? (
                    <b className="ok">완료</b>
                  ) : isToday ? (
                    <b className="now">오늘</b>
                  ) : (
                    `${when.getUTCMonth() + 1}/${when.getUTCDate()}(${W[when.getUTCDay()]})`
                  )}
                  {duration && <i>{duration}</i>}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
