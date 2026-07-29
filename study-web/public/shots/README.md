# 랜딩용 스크린샷

공개 랜딩(`/`)에 들어가는 사진 두 장이 여기 들어간다.

| 파일 | 무엇을 | 규격 |
|---|---|---|
| `hero.png` | 완성된 들꽃 스토어 상품 목록 | 1600×1200 |
| `build.png` | 관리자 상품 등록 (이미지 업로드 중) | 1400×1050 |

넣은 뒤 `study-web/app/page.js`의 `SHOTS` 상수에 경로를 채운다.

```js
const SHOTS = {
  hero: '/shots/hero.png',
  build: '/shots/build.png',
};
```

`null`이면 그 자리는 빈 상자 없이 접힌다. 없어도 랜딩은 멀쩡하다.

모집용이라 **깨진 화면이 아니라 잘 돌아가는 화면**을 찍는다.
커리큘럼용 교보재 촬영은 성격이 다르며 `docs/study-web/SHOOTING-GUIDE.md`가 다룬다.
