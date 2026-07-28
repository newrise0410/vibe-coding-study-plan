import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../auth.js';
import { collections } from '../../../lib/mongodb.js';
import { fieldsFor, requiredFor } from '../../../lib/dayFields.js';
import SubmitForm from '../../../components/SubmitForm.js';

export default async function SubmitPage({ params }) {
  const { day: raw } = await params;
  const day = Number(raw);
  const fields = fieldsFor(day);
  if (!fields.length) notFound();

  const session = await auth();
  if (!session?.user) redirect('/login');

  const { submissions } = await collections();
  const initial = await submissions.findOne({ userId: session.user.id, day });

  return (
    <main className="wrap">
      <nav className="crumb">
        <a href="/me">← 내 진행 상황</a>
        <a href={`/quest/${day}`}>Day {day} 퀘스트 다시 보기</a>
      </nav>

      <h1>Day {day} 인증</h1>

      {initial?.status === 'returned' && (
        <div className="card returned">
          <strong>되돌려받은 인증입니다.</strong>
          <p>{initial.reviewNote}</p>
        </div>
      )}

      <p className="lead">
        <strong>해부</strong>와 <strong>부숴보기</strong>가 핵심입니다. 결과 스크린샷만으로는 통과가 안 되고,
        AI에게 시키기만 해서는 채울 수 없는 칸입니다.
      </p>

      <SubmitForm
        day={day}
        fields={fields}
        required={requiredFor(day)}
        initial={
          initial
            ? { fields: initial.fields, images: initial.images, minutesSpent: initial.minutesSpent }
            : null
        }
      />
    </main>
  );
}
