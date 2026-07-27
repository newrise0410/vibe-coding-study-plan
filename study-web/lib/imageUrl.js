/**
 * 브라우저에서도 쓰는 이미지 주소 헬퍼.
 *
 * 서명(`lib/cloudinary.js`)과 일부러 파일을 나눴다. 저쪽은 `node:crypto` 를 쓰는
 * 서버 전용 코드라, 클라이언트 컴포넌트가 그걸 import 하면 브라우저 번들에 딸려 들어가
 * 빌드가 깨진다. Day 5~6 의 "브라우저 코드와 서버 코드의 경계"가 여기서 실물로 나온다.
 */

/** 같은 원본에서 다른 크기·형식의 이미지를 받아온다. URL 에 옵션을 끼워 넣으면 된다. */
export function resized(url, opts = 'w_320,q_auto,f_auto') {
  return url.replace('/upload/', `/upload/${opts}/`);
}
