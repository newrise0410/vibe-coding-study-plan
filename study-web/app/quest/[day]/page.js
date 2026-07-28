import { notFound, redirect } from 'next/navigation';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from '../../../auth.js';
import { daySection } from '../../../lib/curriculum.js';
import { fieldsFor } from '../../../lib/dayFields.js';
import { parseDate, todayKST, dayToDate, latestDay, toISO } from '../../../lib/schedule.js';

export const dynamic = 'force-dynamic';

const W = ['일', '월', '화', '수', '목', '금', '토'];

export default async function QuestPage({ params }) {
  const { day: raw } = await params;
  const day = Number(raw);
  if (!Number.isInteger(day) || day < 0 || day > 15) notFound();

  const session = await auth();
  if (!session?.user) redirect('/');

  const section = await daySection(day);
  if (!section) notFound();

  const day1 = parseDate(process.env.STUDY_DAY1_DATE || '2026-08-03');
  const today = todayKST();
  const when = dayToDate(day1, day);
  const open = day <= latestDay(day1, today);
  const isToday = toISO(when) === toISO(today);
  const submittable = fieldsFor(day).length > 0;

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/quest">← 15일 지도</a>
        <a href="/me">내 진행 상황</a>
      </nav>

      <p className="daymeta">
        {`${when.getUTCMonth() + 1}월 ${when.getUTCDate()}일 (${W[when.getUTCDay()]})`}
        {section.duration && ` · ${section.duration}`}
        {isToday && <strong> · 오늘</strong>}
        {!open && <span className="tag"> 아직 공개 전</span>}
      </p>

      <article className="md">
        <Markdown remarkPlugins={[remarkGfm]}>{`# ${section.title}\n\n${section.body}`}</Markdown>
      </article>

      <div className="questfoot">
        {submittable && (
          <a className="btn" href={`/submit/${day}`}>
            Day {day} 인증하기
          </a>
        )}
        <a className="sub" href={section.sourceUrl} target="_blank" rel="noreferrer">
          GitHub 에서 보기 ↗
        </a>
      </div>
    </main>
  );
}
