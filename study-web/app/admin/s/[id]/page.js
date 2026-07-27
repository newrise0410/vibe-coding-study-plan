import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '../../../../auth.js';
import { collections } from '../../../../lib/mongodb.js';
import { fieldsFor } from '../../../../lib/dayFields.js';
import { inspect, STATE_LABEL } from '../../../../lib/validate.js';
import ReviewPanel from '../../../../components/ReviewPanel.js';
import { resized } from '../../../../lib/imageUrl.js';

export const dynamic = 'force-dynamic';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export default async function SubmissionPage({ params }) {
  const { error } = await requireAdmin();
  if (error) {
    return (
      <main className="wrap">
        <h1>{error.status}</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const { submissions } = await collections();
  const s = await submissions.findOne({ _id: new ObjectId(id) });
  if (!s) notFound();

  const spec = fieldsFor(s.day);
  const { cells, weak } = inspect(s.day, s.fields);

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/admin">← 대시보드</a>
      </nav>

      <h1>
        {s.userName} · Day {s.day}
      </h1>
      <p className="lead">
        제출 {fmt(s.updatedAt ?? s.createdAt)}
        {s.minutesSpent ? ` · ${s.minutesSpent}분 걸림` : ''}
        {s.revisions?.length ? ` · ${s.revisions.length}번 다시 냄` : ''}
      </p>

      {weak > 0 && (
        <div className="card warn">
          <strong>필수 칸 {weak}개가 약합니다.</strong>
          <p className="note">
            해부와 부숴보기가 핵심입니다. 여기가 비면 AI에게 시키기만 한 것이라 되돌려보냅니다.
            다만 판단은 직접 하세요 — 짧아도 정확한 답일 수 있습니다.
          </p>
        </div>
      )}

      <section>
        {spec.map((f) => {
          const cell = cells[f.key];
          const value = s.fields?.[f.key] ?? '';
          return (
            <div key={f.key} className="answer">
              <h3>
                {f.label}
                {cell.required && <span className="req"> *</span>}
                {cell.state !== 'ok' && cell.state !== 'empty' && (
                  <span className="tag">{STATE_LABEL[cell.state]}</span>
                )}
                <span className="len">{cell.length}자</span>
              </h3>
              {f.kind === 'image' ? (
                s.images?.[f.key]?.length ? (
                  <div className="shots">
                    {s.images[f.key].map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resized(u)} alt="인증 스크린샷" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="note">(스샷 없음)</p>
                )
              ) : value ? (
                f.kind === 'url' ? (
                  <p>
                    <a href={value} target="_blank" rel="noreferrer">
                      {value}
                    </a>
                  </p>
                ) : (
                  <pre>{value}</pre>
                )
              ) : (
                <p className="note">(비어 있음)</p>
              )}
            </div>
          );
        })}
      </section>

      <ReviewPanel id={String(s._id)} status={s.status} initialNote={s.reviewNote ?? ''} />

      {s.revisions?.length > 0 && (
        <section>
          <h2>이전 제출 {s.revisions.length}건</h2>
          {s.revisions.map((r, i) => (
            <details key={i}>
              <summary>{fmt(r.at)}</summary>
              {Object.entries(r.fields ?? {}).map(([k, v]) => (
                <div key={k} className="answer">
                  <h3>{k}</h3>
                  <pre>{v}</pre>
                </div>
              ))}
            </details>
          ))}
        </section>
      )}
    </main>
  );
}
