# 기술 스택 지도

무엇을 왜 쓰는지, 그리고 계정·키를 어디서 얻는지.

---

## 전체 그림

```
                        [ 방문자의 브라우저 ]
                                │
                    화면·클릭·결제창 호출
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ▼                       ▼                        ▼
  [ Vercel ]              [ Cloudinary ]          [ KG이니시스 ]
  Next.js 실행             이미지 직접 업로드         결제창 (카드 입력)
  화면 + API              (서버가 발급한 서명 필요)   ← 카드정보는 여기만
        │
        ├──────→ [ MongoDB Atlas ]   상품 · 주문 · 회원
        ├──────→ [ Google OAuth ]    로그인 (비밀번호는 구글이 관리)
        └──────→ [ 포트원 API ]      결제 조회·검증  ←→ 웹훅으로 알림 받음
```

**핵심 원칙**: 비밀번호와 카드번호는 **우리가 안 만진다.** 만지는 순간 지킬 책임이 생긴다.

---

## 각각 왜 이걸 쓰나

### Next.js
프론트와 백엔드를 한 프로젝트에서. 서버를 따로 띄우고 CORS를 다루는 단계를 건너뛴다.
`app/api/` 폴더가 곧 서버다. 폴더 구조가 곧 주소다.

### MongoDB Atlas
무료 티어(M0)로 충분하고, 문서가 JSON 객체라 JS에서 쓰던 모양 그대로 저장된다.
첫 DB로 배울 게 가장 적다. SQL과 테이블 개념은 나중에 배우면 된다.

### Cloudinary
이미지 저장 + 자동 최적화 + CDN이 한 번에. 무료 티어로 스터디에 충분.
URL에 옵션을 넣으면 크기·형식이 바뀐 이미지가 나온다.

### Auth.js (NextAuth) + Google
비밀번호를 직접 다루지 않는다. 해시·솔트·유출 대응·재설정 메일 전부 안 만들어도 된다.
초보자가 인증에서 실수하면 피해가 사용자에게 간다. 그래서 남에게 맡긴다.

### 포트원 + KG이니시스
포트원이 여러 PG를 하나의 방식으로 통일해준다. 나중에 PG를 바꿔도 채널 키만 바꾸면 된다.
**테스트 채널은 사업자등록 없이 만들 수 있고**, 승인·검증·웹훅 전 과정을 실습할 수 있다.

### Vercel
GitHub에 푸시하면 자동 배포. Next.js를 만든 회사라 설정이 거의 필요 없다.

---

## 계정과 키 얻는 곳

| 서비스 | 가입 | 키를 어디서 보나 |
|---|---|---|
| GitHub | github.com/signup | — |
| Vercel | vercel.com (**Continue with GitHub**) | — |
| MongoDB Atlas | mongodb.com/cloud/atlas | 클러스터 → Connect → Drivers |
| Cloudinary | cloudinary.com | Dashboard 상단 |
| Google OAuth | console.cloud.google.com | API 및 서비스 → 사용자 인증 정보 |
| 포트원 | admin.portone.io | 결제 연동 → 채널 / 상점 정보 |

---

## 환경변수 전체 목록

`.env.local` (로컬)과 **Vercel Settings → Environment Variables** 에 **양쪽 다** 넣어야 한다.
하나 추가할 때마다 양쪽. 이걸 빠뜨리는 게 "배포하면 안 돼요"의 2위 원인이다.

| 변수 | 도입 Day | 공개? | 설명 |
|---|---|---|---|
| `MONGODB_URI` | 7 | ❌ 비공개 | DB 접속 문자열. 이거 하나로 DB 전체 권한 |
| `CLOUDINARY_CLOUD_NAME` | 9 | ❌ | 서버 서명 생성용 |
| `CLOUDINARY_API_KEY` | 9 | ❌ | |
| `CLOUDINARY_API_SECRET` | 9 | ❌ **절대** | 새면 남이 내 계정에 업로드·삭제 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | 9 | ✅ 공개 OK | 업로드 주소를 만들 때 브라우저에 필요 |
| `AUTH_SECRET` | 10 | ❌ **절대** | 새면 세션 위조 가능 |
| `AUTH_GOOGLE_ID` | 10 | ❌ | |
| `AUTH_GOOGLE_SECRET` | 10 | ❌ **절대** | |
| `AUTH_URL` (또는 `NEXTAUTH_URL`) | 10 | ❌ | 배포 주소. 로컬과 배포가 다르다 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | 12 | ✅ 공개 OK | 결제창을 브라우저가 띄우므로 필요 |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 12 | ✅ 공개 OK | 위와 같음 |
| `PORTONE_API_SECRET` | 12 | ❌ **절대** | 새면 남이 결제 조회·**취소** 가능 |
| `PORTONE_WEBHOOK_SECRET` | 13 | ❌ **절대** | 웹훅 서명 검증용 |

### `NEXT_PUBLIC_` 규칙

```
NEXT_PUBLIC_ 이 붙은 것  →  브라우저로 전송된다. 전 세계에 공개된다
안 붙은 것              →  서버에서만 읽힌다
```

**공개 OK인 값들의 공통점**: 그것만으로는 아무것도 할 수 없다. 상점 ID를 안다고 남의 결제를 못 만든다.
**비공개인 값들의 공통점**: 그것 하나로 권한 행사가 가능하다.

의심스러우면 이 질문을 해보면 된다.
**"이 값을 트위터에 올려도 괜찮은가?"** 아니면 `NEXT_PUBLIC_`을 붙이면 안 된다.

### 확인하는 법 (Day 9·14에서 실습)

배포된 사이트에서 F12 → **Sources** → `Ctrl+Shift+F` 전체 검색 →
`secret`, `mongodb+srv`, 실제 키 값을 검색. **하나라도 나오면 그 키는 재발급한다.**

---

## 무료 티어 한도

스터디 규모에서는 전부 넉넉하지만, 알아두면 좋다.

| 서비스 | 한도 | 넘으면 |
|---|---|---|
| MongoDB Atlas M0 | 512MB 저장, 연결 수 제한 | 쓰기 실패 |
| Cloudinary Free | 월 25 크레딧(저장·변환·전송 합산) | 업로드/변환 제한 |
| Vercel Hobby | 상업적 사용 불가, 함수 실행 시간 제한 | — |
| 포트원 테스트 | 실제 정산 없음 | — |

> **Vercel Hobby 플랜은 상업적 사용이 금지되어 있다.**
> 스터디 결과물을 실제 장사에 쓰려면 Pro로 올리거나 다른 호스팅을 써야 한다.
> 실거래 전환을 생각한다면 `resources/payment-inicis.md`를 먼저 읽을 것.

---

## 자주 헷갈리는 것

| 헷갈리는 것 | 정리 |
|---|---|
| `.env.local` vs Vercel 환경변수 | **완전히 별개다.** 양쪽에 각각 넣어야 한다 |
| Atlas 계정 비밀번호 vs DB 사용자 비밀번호 | 다르다. 연결 문자열에 들어가는 건 **DB 사용자** 쪽 |
| 포트원 상점 ID vs 채널 키 vs API Secret | 앞의 둘은 공개 OK, 마지막은 절대 비공개 |
| 인증(Authentication) vs 인가(Authorization) | 누구냐(401) vs 해도 되냐(403) |
| 로컬 `localhost:3000` vs 배포 주소 | 구글 OAuth 리디렉션 URI에 **둘 다** 등록해야 한다 |
