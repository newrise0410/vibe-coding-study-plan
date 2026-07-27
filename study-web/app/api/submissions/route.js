import { requireUser } from '../../../auth.js';
import { collections } from '../../../lib/mongodb.js';
import { validateSubmission } from '../../../lib/validate.js';
import { notifySubmission } from '../../../lib/discord.js';

/** 내 인증 목록 */
export async function GET() {
  const { error, user } = await requireUser();
  if (error) return Response.json({ message: error.message }, { status: error.status });

  const { submissions } = await collections();
  const mine = await submissions
    .find({ userId: user.id })
    .project({ revisions: 0 })
    .sort({ day: 1 })
    .toArray();

  return Response.json({ submissions: mine });
}

/** 인증 제출. 같은 Day 를 다시 내면 이전 내용을 revisions 로 밀어넣고 덮어쓴다. */
export async function POST(request) {
  const { error, user } = await requireUser();
  if (error) return Response.json({ message: error.message }, { status: error.status });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: '본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const day = Number(body?.day);
  const result = validateSubmission(day, body);
  if (!result.ok) {
    // 어느 필드가 왜 잘못됐는지 알려준다. "실패했습니다"만 오면 쓸모없는 에러다.
    return Response.json({ message: '입력을 확인해주세요', errors: result.errors }, { status: 400 });
  }

  try {
    const { submissions } = await collections();
    const now = new Date();
    const prev = await submissions.findOne({ userId: user.id, day });

    await submissions.updateOne(
      { userId: user.id, day },
      {
        $set: {
          ...result.value,
          userId: user.id,
          userName: user.name,
          status: 'submitted',
          reviewNote: null,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        ...(prev
          ? { $push: { revisions: { fields: prev.fields, at: prev.updatedAt ?? prev.createdAt } } }
          : {}),
      },
      { upsert: true },
    );

    // Discord 로는 요약만. 전문은 웹에서 본다.
    notifySubmission({ name: user.name, day, resubmitted: Boolean(prev) }).catch(() => {});

    return Response.json({ ok: true, day, resubmitted: Boolean(prev) }, { status: prev ? 200 : 201 });
  } catch (e) {
    // 상세는 서버 로그에만. 사용자에게 보내면 DB 구조나 경로가 샌다.
    console.error('[submissions POST]', e);
    return Response.json({ message: '일시적인 오류입니다. 잠시 후 다시 시도해주세요' }, { status: 500 });
  }
}
