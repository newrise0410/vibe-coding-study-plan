import crypto from 'node:crypto';

/**
 * Cloudinary 업로드 서명.
 *
 * 규칙: 서명에 넣을 파라미터를 이름순으로 정렬해 `key=value` 로 잇고,
 * 끝에 API Secret 을 붙여 sha1 을 낸다.
 *
 * 여기 넣은 값은 업로드할 때도 **똑같이** 보내야 한다. 하나라도 다르면 401 이 온다.
 * Day 9 에서 참가자가 가장 많이 헤매는 지점이 이 불일치다.
 */
export function sign(params, apiSecret) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/** 원본 그대로 두면 무료 티어가 금방 찬다. 올라오는 순간 폭 1600 으로 제한한다. */
export const INCOMING_TRANSFORM = 'c_limit,w_1600,q_auto';

