import { ObjectId } from 'mongodb';
import { requireAdmin } from '../../../../auth.js';
import { collections } from '../../../../lib/mongodb.js';
import { notifyReturned } from '../../../../lib/discord.js';

const MIN_NOTE = 5;

/**
 * 인증 검토. 되돌려보내거나 통과시킨다.
 *
 * 권한 검사는 여기서 한다. 화면에서 버튼을 숨기는 건 보안이 아니다 —
 * 주소를 직접 치거나 콘솔에서 fetch 로 부르면 그만이니까.
 */
export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return Response.json({ message: error.message }, { status: error.status });

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ message: '잘못된 주소입니다' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: '본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const action = body?.action;
  if (action !== 'return' && action !== 'accept') {
    return Response.json({ message: "action 은 'return' 또는 'accept' 여야 합니다" }, { status: 400 });
  }

  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  if (action === 'return') {
    // 메모 없이 되돌려보내지 않는다. 뭘 고쳐야 하는지 모르면 그냥 상처만 준다.
    if (note.length < MIN_NOTE) {
      return Response.json(
        { message: '무엇을 더 해오면 되는지 한 줄이라도 적어주세요', errors: { note: `${MIN_NOTE}자 이상` } },
        { status: 400 },
      );
    }
    if (note.length > 500) {
      return Response.json({ message: '500자를 넘습니다', errors: { note: '너무 깁니다' } }, { status: 400 });
    }
  }

  try {
    const { submissions } = await collections();
    const target = await submissions.findOne({ _id: new ObjectId(id) });
    if (!target) return Response.json({ message: '없는 인증입니다' }, { status: 404 });

    await submissions.updateOne(
      { _id: target._id },
      {
        $set: {
          status: action === 'return' ? 'returned' : 'accepted',
          reviewNote: action === 'return' ? note : null,
          reviewedAt: new Date(),
        },
      },
    );

    if (action === 'return') {
      notifyReturned({ name: target.userName, day: target.day, note }).catch(() => {});
    }

    return Response.json({ ok: true, status: action === 'return' ? 'returned' : 'accepted' });
  } catch (e) {
    console.error('[submissions PATCH]', e);
    return Response.json({ message: '일시적인 오류입니다. 잠시 후 다시 시도해주세요' }, { status: 500 });
  }
}
