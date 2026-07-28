import { requireAdmin } from '../../auth.js';
import { collections } from '../../lib/mongodb.js';
import { buildMatrix, dayStats, CELL } from '../../lib/matrix.js';
import { parseDate, todayKST, dayToDate } from '../../lib/schedule.js';
import { inspect } from '../../lib/validate.js';

/** 8/3 -> '8월 3일 (월)' */
function fmtDate(d) {
  const W = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${W[d.getUTCDay()]})`;
}

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 권한 검사는 화면이 아니라 여기서. 주소를 직접 쳐도 막힌다.
  const { error } = await requireAdmin();
  if (error) {
    return (
      <main className="wrap">
        <h1>{error.status}</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  const { users, submissions } = await collections();
  const [allUsers, allSubs] = await Promise.all([
    users.find({}).toArray(),
    submissions.find({}).project({ revisions: 0 }).toArray(),
  ]);

  const day1 = parseDate(process.env.STUDY_DAY1_DATE || '2026-08-03');
  const today = todayKST();
  const { days, rows, openDay } = buildMatrix({ users: allUsers, submissions: allSubs, day1, today });
  const stats = dayStats({ rows, days });
  const quiet = rows.filter((r) => r.quiet);

  // 아직 검토하지 않은 인증. 약한 칸이 있는 것부터 위로.
  const pending = allSubs
    .filter((s) => (s.status ?? 'submitted') === 'submitted')
    .map((s) => ({ ...s, weak: inspect(s.day, s.fields).weak }))
    .sort((a, b) => b.weak - a.weak || new Date(a.updatedAt) - new Date(b.updatedAt));

  return (
    <main className="wrap wide">
      <h1>운영 대시보드</h1>
      <p className="lead">
        {openDay < 0
          ? `아직 시작 전 · Day 1은 ${fmtDate(dayToDate(day1, 1))}`
          : `오늘까지 공개된 Day ${openDay}`}
        {' · '}참가자 {rows.length}명
        {openDay >= 1 && ` · 조용한 사람 ${quiet.length}명`}
      </p>

      {quiet.length > 0 && (
        <section className="card warn">
          <h2>조용한 사람 {quiet.length}명</h2>
          <ul>
            {quiet.map((r) => (
              <li key={r.userId}>
                <strong>{r.name}</strong> — {r.silentFor}일 미제출{' '}
                {r.lastAt ? `(마지막 ${r.lastAt})` : '(한 번도 안 냄)'}
              </li>
            ))}
          </ul>
          <p className="note">
            여기서 DM을 보내지 않습니다. 정형 메시지는 효과가 없습니다. Discord에서 직접,
            구체적인 질문으로 물어보세요 — &quot;Day 7 DB 연결에서 막히셨어요? 터미널 에러 스샷만 주시면 볼게요&quot;
          </p>
        </section>
      )}

      <section>
        <h2>검토 대기 {pending.length}건</h2>
        {pending.length === 0 ? (
          <p className="note">전부 검토했습니다.</p>
        ) : (
          <ul className="queue">
            {pending.slice(0, 20).map((s) => (
              <li key={String(s._id)}>
                <span className="who">{s.userName}</span>
                <a href={`/admin/s/${String(s._id)}`}>Day {s.day}</a>
                {s.weak > 0 && <span className="why">필수 칸 {s.weak}개 약함</span>}
                <span className="when">
                  {new Date(s.updatedAt ?? s.createdAt).toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 20 && <p className="note">위 20건만 보입니다.</p>}
      </section>

      <section>
        <h2>사람 × Day</h2>
        <div className="scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th className="sticky">이름</th>
                {days.map((d) => (
                  <th key={d} className={d > openDay ? 'future' : ''}>
                    {d}
                  </th>
                ))}
                <th>완료</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className={r.quiet ? 'quiet' : ''}>
                  <th className="sticky">{r.name}</th>
                  {r.cells.map((c) => (
                    <td key={c.day} className={`c-${c.mark || 'empty'}`}>
                      {c.id ? <a href={`/admin/s/${c.id}`}>{c.mark}</a> : ''}
                    </td>
                  ))}
                  <td className="num">{r.done}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <code>{CELL.ACCEPTED}</code> 제출 · <code>{CELL.RETURNED}</code> 되돌려보냄 · 빈칸 미제출
        </p>
      </section>

      <section>
        <h2>Day별 완료율</h2>
        <div className="bars">
          {stats.map((s) => (
            <div key={s.day} className="bar">
              <div className="fill" style={{ height: `${s.rate}%` }} />
              <span className="lab">{s.day}</span>
              <span className="pct">{s.rate}%</span>
            </div>
          ))}
        </div>
        <p className="note">
          Day 6과 Day 12–13이 난이도 절벽입니다. 여기서 완료율이 떨어지는 건 설계대로고,
          다음 기수에 쪼갤지 판단하는 근거가 됩니다.
        </p>
      </section>
    </main>
  );
}
