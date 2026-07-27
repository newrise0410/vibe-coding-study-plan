/**
 * 서버 검증. 이 파일이 Day 8 의 실물이다.
 *
 * 화면의 검증은 친절이고, 서버의 검증이 진짜다.
 * 폼에 required 를 걸어도 콘솔에서 fetch 로 그냥 보내면 그만이다.
 */

import { fieldsFor, requiredFor, MIN_CHARS } from './dayFields.js';

// curriculum 안내문을 그대로 붙여넣은 경우를 잡는다.
const PLACEHOLDER = new Set(['', '-', '.', 'x', 'ㅇ', '없음', '없슴', '패스', '생략', 'n/a']);

// 우리 Cloudinary 계정에서 온 주소만 받는다. 남의 주소를 저장하지 않는다.
export const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[\w./,%-]+$/;
export const MAX_IMAGES = 6;

function isBlank(v) {
  const s = (v ?? '').trim();
  if (!s) return true;
  return PLACEHOLDER.has(s.toLowerCase());
}

function isTemplateEcho(v) {
  const s = (v ?? '').trim();
  // 값 전체가 괄호로 감싸여 있으면 안내문이다. 실제 답은 이렇게 안 쓴다.
  return /^[(（][\s\S]+[)）]$/.test(s);
}

/**
 * 인증 하나를 칸별로 진단한다. 운영자 화면에서 어디가 약한지 바로 보이게.
 *
 * 판단은 사람이 한다. 여기서는 근거만 만든다.
 */
export function inspect(day, fields) {
  const required = requiredFor(day);
  const cells = {};
  let weak = 0;

  for (const f of fieldsFor(day)) {
    const v = fields?.[f.key] ?? '';
    const req = required.includes(f.key);
    let state = 'ok';

    if (isBlank(v)) state = req ? 'blank' : 'empty';
    else if (isTemplateEcho(v)) state = 'template';
    else if (req && v.length < MIN_CHARS) state = 'short';

    if (req && state !== 'ok') weak += 1;
    cells[f.key] = { state, required: req, length: v.trim().length };
  }

  return { cells, weak };
}

export const STATE_LABEL = {
  ok: '',
  empty: '비어 있음 (선택)',
  blank: '비어 있음',
  template: '안내문 그대로',
  short: '너무 짧음',
};

/**
 * 1) 있어야 할 값이 있나  2) 타입이 맞나  3) 범위가 말이 되나
 * 4) 보내면 안 되는 값이 섞였나  ← 화이트리스트
 */
export function validateSubmission(day, body) {
  const errors = {};

  if (!Number.isInteger(day) || day < 0 || day > 15) {
    return { ok: false, errors: { day: 'Day 는 0~15 사이여야 합니다' }, value: null };
  }

  const spec = fieldsFor(day);
  const allowed = new Set(spec.map((f) => f.key));
  const required = requiredFor(day);

  // 4. 화이트리스트 — 사용자가 보낸 객체를 통째로 저장하지 않는다.
  const fields = {};
  for (const f of spec) {
    const raw = body?.fields?.[f.key];
    if (raw == null) continue;
    if (typeof raw !== 'string') {
      errors[f.key] = '문자열이어야 합니다';
      continue;
    }
    if (raw.length > 5000) {
      errors[f.key] = '5000자를 넘습니다';
      continue;
    }
    fields[f.key] = raw.trim();
  }

  // 1·3. 필수 칸이 실하게 찼나
  for (const key of required) {
    if (!allowed.has(key)) continue;
    const v = fields[key];
    if (isBlank(v)) {
      errors[key] = '이 칸은 비워둘 수 없습니다';
    } else if (isTemplateEcho(v)) {
      errors[key] = '안내문을 그대로 두지 말고 직접 쓴 내용을 넣어주세요';
    } else if (v.length < MIN_CHARS) {
      errors[key] = `너무 짧습니다 (${v.length}자). 찾아낸 것을 구체적으로 적어주세요`;
    }
  }

  // 2. 타입·형식
  for (const f of spec) {
    const v = fields[f.key];
    if (!v || errors[f.key]) continue;
    if (f.kind === 'url' && !/^https?:\/\/\S+$/.test(v)) {
      errors[f.key] = 'http:// 또는 https:// 로 시작하는 주소여야 합니다';
    }
  }

  const minutes = Number(body?.minutesSpent);
  if (body?.minutesSpent != null && (!Number.isFinite(minutes) || minutes < 0 || minutes > 600)) {
    errors.minutesSpent = '0~600 사이의 숫자여야 합니다';
  }

  // 스샷은 칸별로 담는다. Day 15 는 Lighthouse 와 카톡 미리보기가 별개 칸이다.
  // 여기도 화이트리스트다 — 그 Day 에 없는 칸 이름으로 보내면 버린다.
  const imageKeys = new Set(spec.filter((f) => f.kind === 'image').map((f) => f.key));
  const images = {};
  if (body?.images && typeof body.images === 'object' && !Array.isArray(body.images)) {
    for (const [key, list] of Object.entries(body.images)) {
      if (!imageKeys.has(key) || !Array.isArray(list)) continue;
      const urls = list
        .filter((u) => typeof u === 'string' && CLOUDINARY_URL.test(u))
        .slice(0, MAX_IMAGES);
      if (urls.length) images[key] = urls;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: {},
    value: {
      day,
      fields,
      images,
      minutesSpent: Number.isFinite(minutes) ? minutes : null,
    },
  };
}
