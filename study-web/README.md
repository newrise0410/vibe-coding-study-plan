# 들꽃 스터디 운영 웹

인증 접수와 진행 추적. **커리큘럼과 똑같은 스택으로 만들어서, 만드는 과정을 교보재로 쓴다.**

설계는 `../docs/study-web/DESIGN.md`, 촬영 계획은 `../docs/study-web/SHOOTING-GUIDE.md`.

## 먼저 — 📸 찍고 시작하세요

이 폴더는 이미 스캐폴딩이 끝나 있습니다. 그래서 **`create-next-app` 선택지 화면을 못 보게 됩니다.**
촬영 가이드의 "한 번뿐" 항목이라 따로 한 번 돌려서 찍어두세요. 30초면 됩니다.

```bash
npx create-next-app@latest dulkkot-throwaway
# TypeScript No / ESLint Yes / Tailwind No / src/ No / App Router Yes / Turbopack Yes / alias No
# 선택지 화면을 스샷으로 남기고
rm -rf dulkkot-throwaway
```

이 스샷은 Day 5 아침에 `#공지`에 박아둡니다. `operator-guide.md`가 명시적으로 요구하는 것입니다.

## 시작

```bash
npm install
cp .env.local.example .env.local   # 값을 채운다
npm run dev
```

**환경변수는 로컬과 Vercel 양쪽에 넣습니다.** 하나 추가할 때마다 양쪽.
이걸 빠뜨리는 게 "배포하면 안 돼요"의 2위 원인입니다.

`AUTH_SECRET`은 `npx auth secret`으로 만듭니다.

**관리자 승격은 화면으로 하지 않습니다.** 로그인 한 번 하고 Atlas에서 본인 users 문서의
`role`을 `"admin"`으로 직접 바꾸세요. 화면에 승격 버튼을 두면 그게 곧 취약점입니다.

## 순수 로직 테스트

DB도 Discord도 없이 돕니다.

```bash
node lib/test-logic.mjs
```

Day별 필드 정의, 서버 검증, 일정 계산(주말 건너뛰기), 이탈 판정, 행렬 생성을 검증합니다.

## 스터디 Day와의 대응

| 파일 | 커리큘럼 | 무엇의 실물인가 |
|---|---|---|
| `lib/mongodb.js` | Day 7 | `globalThis` 커넥션 캐시 |
| `lib/validate.js` | Day 8 | 서버 검증 4종 + 화이트리스트 |
| `auth.js` | Day 10 | OAuth, 401/403 구분, **권한 검사는 API에서** |
| `app/api/submissions/route.js` | Day 6·8 | 라우트, 상태 코드, 에러를 사용자에게 안 보이기 |
| `lib/schedule.js` | — | Day↔날짜. 이탈은 퀘스트 있는 날만 센다 |
| `lib/cloudinary.js` | Day 9 | 업로드 서명 (서버 전용) |
| `lib/imageUrl.js` | Day 5·6 | 클라이언트도 쓰는 URL 헬퍼. 서버 코드와 일부러 분리 |
| `lib/dayFields.js` | 전체 | Day마다 다른 인증 필드 |

`lib/dayFields.js`가 이 프로젝트에서 가장 값진 파일입니다. 커리큘럼의 인증 블록 16개를 전부
읽어서 뽑은 규칙이고, 봇 작업(`study-bot` 브랜치)에서 넘어왔습니다.

## 아직 안 만든 것

스캐폴딩 단계라 다음은 비어 있습니다.

- `/quest/[day]` — `curriculum/*.md`를 렌더하는 화면
- `/admin/s/[id]` — 인증 상세와 **되돌려보내기**. 지금은 행렬에서 링크만 걸려 있습니다
- 뱃지 — `/me`에서 계산해 보여주기만 하고 저장하지 않습니다
- Day 12–13 결제 — 이 앱엔 해당 없음. `DESIGN.md`의 대안 참조

## 배포할 때

Vercel Import 시 **Root Directory를 `study-web`으로** 지정해야 합니다. 이 폴더가 커리큘럼
repo 안에 있기 때문입니다.

교보재 스샷을 커리큘럼과 똑같이 맞추려면(참가자는 "설정 그대로 Deploy"를 누릅니다)
이 폴더를 별도 repo로 떼는 게 낫습니다.

```bash
cp -r study-web ../dulkkot-study-web && cd ../dulkkot-study-web && git init
```
