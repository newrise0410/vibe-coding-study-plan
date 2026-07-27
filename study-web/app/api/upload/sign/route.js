import { requireUser } from '../../../../auth.js';
import { fieldsFor } from '../../../../lib/dayFields.js';
import { sign, INCOMING_TRANSFORM } from '../../../../lib/cloudinary.js';

/**
 * Cloudinary 업로드 서명 발급. Day 9 의 실물이다.
 *
 * 큰 파일이 우리 서버를 거치지 않는다. 브라우저가 Cloudinary 로 직접 올린다.
 * 그럼 아무나 내 계정에 올릴 수 있는 것 아닌가? — 그래서 서명이 있다.
 *
 * API Secret 은 절대 클라이언트로 나가지 않는다. 서버가 Secret 으로 서명만 만들어 주고,
 * 그 서명은 짧은 시간만 유효한 일회용 허가증이다.
 */

export async function POST(request) {
  const { error, user } = await requireUser();
  if (error) return Response.json({ message: error.message }, { status: error.status });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[upload/sign] Cloudinary 환경변수 누락');
    return Response.json({ message: '업로드가 아직 설정되지 않았습니다' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: '본문을 읽을 수 없습니다' }, { status: 400 });
  }

  const day = Number(body?.day);
  const fieldKey = String(body?.fieldKey ?? '');
  const spec = fieldsFor(day);
  const ok = spec.some((f) => f.key === fieldKey && f.kind === 'image');
  if (!ok) {
    // 아무 폴더에나 올리지 못하게 한다. 그 Day 에 실재하는 이미지 칸만 허용.
    return Response.json({ message: '업로드할 수 없는 칸입니다' }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `dulkkot/day${day}/${user.id}`;

  // 서명 규칙: 서명에 넣을 파라미터를 이름순으로 정렬해 key=value 로 잇고,
  // 끝에 API Secret 을 붙여 sha1 을 낸다. 여기 넣은 값은 업로드할 때도 똑같이 보내야 한다.
  const params = { folder, timestamp, transformation: INCOMING_TRANSFORM };
  const signature = sign(params, apiSecret);

  return Response.json({ cloudName, apiKey, signature, ...params });
}
