# 첫 배포 런북

코드는 이미 GitHub `master` 에 있다. 여기부터는 콘솔 작업이고 **동시에 교보재 촬영이다.**

📸 = 지금 아니면 다시 못 찍는다 · 💥 = 일부러 고장 내서 찍는다

> **모든 스샷은 찍고 바로 키를 가린다.** Atlas 연결 문자열, Cloudinary Secret,
> 구글 OAuth Secret 이 그대로 찍힌다. 가린 뒤에도 미심쩍으면 그 키는 재발급한다.

---

## 0. 먼저 찍을 것 (2분)

스캐폴딩이 이미 끝나 있어서 이 화면을 못 본다. 따로 한 번 돌려서 찍는다.

```bash
npx create-next-app@latest throwaway
# TypeScript No / ESLint Yes / Tailwind No / src/ No / App Router Yes / Turbopack Yes / alias No
```

📸 **선택지 화면** — Day 5 아침 `#공지` 에 박아둘 것. `operator-guide.md` 가 명시적으로 요구한다.

찍었으면 `throwaway` 폴더는 지운다.

---

## 1. MongoDB Atlas (Day 7 교보재)

https://www.mongodb.com/cloud/atlas/register

📸 네 장. 클러스터당 한 번뿐이다.

1. `Create` → **M0 (Free)** 선택 (유료 티어와 나란히 보이게)
2. 지역 `Seoul`
3. **Database Access** → 사용자 생성 — "비밀번호는 다시 못 본다" 경고까지
4. **Network Access** → `Add IP Address` → `0.0.0.0/0`

> 비밀번호는 **영문+숫자로만.** `@ : / ? # &` 가 들어가면 URL 인코딩이 필요해서
> `Authentication failed` 로 시간을 날린다. 참가자 절반이 여기서 막힌다.

📸 `Connect` → `Drivers` → 연결 문자열 (**비밀번호 가리고**)

---

## 2. 구글 OAuth (Day 10 교보재 — 최대 병목)

https://console.cloud.google.com

📸 다섯 장. 여기가 가장 공들여 찍을 구간이다. UI 가 복잡해서 스샷 가이드만 있어도 질문이 확 준다.

1. 프로젝트 생성
2. `OAuth 동의 화면` — 외부 / 앱 이름 / 이메일
3. `사용자 인증 정보` → `OAuth 클라이언트 ID` → **웹 애플리케이션**
4. **승인된 리디렉션 URI** — 지금은 로컬 것만 넣는다

   ```
   http://localhost:3000/api/auth/callback/google
   ```

   배포 주소는 4단계에서 주소를 받은 뒤 **추가로** 넣는다
5. 클라이언트 ID / Secret 발급 (**값 가리기**)

---

## 3. 로컬에서 먼저 띄운다

배포 전에 로컬이 돌아야 한다. 여기서 안 되면 배포해도 안 된다.

```bash
cd study-web
npm install
cp .env.local.example .env.local
```

`.env.local` 에 채울 것: `MONGODB_URI`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

`AUTH_SECRET` 은 이 명령으로 만든다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **`npx auth secret` 을 쓰지 말 것.** 그 CLI 는 `BETTER_AUTH_SECRET` 이라는 **다른 이름**으로
> 값을 쓴다. `AUTH_SECRET` 은 빈 채로 남고 로그인 시도해야 `MissingSecret` 으로 터진다.

채웠으면 띄우기 전에 점검한다. 값은 안 찍고 이름과 길이만 본다.

```bash
node lib/check-env.mjs   # 빠진 값·오타 난 키
node lib/check-db.mjs    # Atlas 연결
npm run dev
```

> **`.env.local` 을 고쳤으면 개발 서버를 껐다 켠다.** 자동 반영이 안 될 때가 있고,
> 그러면 값은 맞는데 에러가 계속 나서 원인을 엉뚱한 데서 찾게 된다.

http://localhost:3000 → 구글 로그인 → `/me` 로 들어가면 성공이다.

**관리자 승격**: 로그인 한 번 한 뒤 Atlas → `dulkkot_study` → `users` 에서
내 문서의 `role` 을 `"admin"` 으로 직접 바꾼다. 화면에 승격 버튼은 일부러 안 만들었다.

그다음 `/submit/1` 에서 인증을 하나 넣어보고 `/admin` 에서 행렬에 뜨는지 본다.

💥 **Day 8 교보재** — 폼을 거치지 않고 콘솔에서 직접 보내본다. 서버 검증이 사는지 확인.

```js
await fetch('/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ day: 1, fields: { 해부: '', 부숴보기: '' } })
}).then(r => r.json().then(d => console.log(r.status, d)));
```

`400` 과 함께 **어느 필드가 왜 잘못됐는지** 가 와야 한다. 이 응답 화면을 찍어둔다.

---

## 4. Vercel 배포 (Day 3 교보재)

https://vercel.com → `Add New` → `Project` → 이 저장소 `Import`

📸 **Import 화면** (프로젝트당 한 번뿐)

> ⚠️ **Root Directory 를 `study-web` 으로 지정한다.** 앱이 하위 폴더에 있기 때문이다.
> 참가자는 이 단계가 없다("설정 그대로 Deploy"). 교보재로 쓸 땐 이 차이를 말해주거나,
> 아예 `study-web` 을 별도 repo 로 떼는 게 낫다.

**Environment Variables** 에 `.env.local` 의 값을 **전부** 다시 넣는다. 로컬과 별개다.

> 손으로 옮기다 복사 실수가 나기 쉽다. 스크립트로 밀어 올릴 수도 있다.
>
> ```bash
> # 토큰은 https://vercel.com/account/tokens 에서 발급 (웹, 1분)
> VERCEL_TOKEN=xxx node lib/sync-vercel-env.mjs           # 미리보기
> VERCEL_TOKEN=xxx node lib/sync-vercel-env.mjs --apply   # 반영
> ```
>
> `AUTH_URL` 은 일부러 제외한다. 로컬 주소라 배포에 올리면 오히려 로그인이 깨진다.

| 변수 | 값 |
|---|---|
| `MONGODB_URI` | 1번에서 받은 것 |
| `MONGODB_DB` | `dulkkot_study` |
| `AUTH_SECRET` | 로컬과 같은 값 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | 2번에서 받은 것 |
| `STUDY_DAY1_DATE` | Day 1 날짜 (`2026-08-03` 형식) |

`Deploy` → 📸 **빌드 로그가 도는 화면**과 **성공 직후 주소가 뜬 화면**

### 배포 직후 반드시 할 것

구글 콘솔로 돌아가 **승인된 리디렉션 URI 에 배포 주소를 추가**한다.

```
https://<받은주소>.vercel.app/api/auth/callback/google
```

안 하면 배포에서 로그인이 `redirect_uri_mismatch` 로 막힌다.

💥 **Day 10 교보재** — 추가하기 **전에** 배포 사이트에서 로그인을 시도해 그 에러 화면을 먼저 찍는다.
최대 병목의 실물이고 끝 슬래시까지 정확해야 한다는 걸 같이 보여준다.

---

## 5. 배포 후 교보재 몰아 찍기

전부 재현 가능하니 여유 있을 때 한 번에 한다.

💥 **Day 7 — 환경변수 누락** ("로컬은 되는데 배포가 안 돼요" 2위 원인)
Vercel 에서 `MONGODB_URI` 를 지우고 재배포 → 로컬 정상 화면과 배포 에러 화면을 **나란히**

💥 **Day 7 — IP 차단**
Atlas Network Access 에서 `0.0.0.0/0` 을 지우고 배포 사이트 접속 → 타임아웃.
**찍고 반드시 되돌린다**

💥 **Day 3 — 대소문자** (스터디 전체 최대 병목)
파일명 하나를 대문자로 바꿔 푸시 → 내 컴퓨터는 멀쩡, 배포만 깨짐. 두 화면을 나란히. 찍고 되돌린다

💥 **Day 10 — 권한 우회**
로그아웃 상태에서 콘솔로 관리자 API 직접 호출

```js
await fetch('/api/submissions/아무id', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'accept' })
}).then(r => console.log(r.status));
```

`401` 이 와야 정상이다. `200` 이 오면 뚫린 것이다

📸 **Day 14** — Sources → `Ctrl+Shift+F` 로 `mongodb+srv`, `secret` 검색 → **아무것도 안 나오는 화면**
📸 **Day 15** — Lighthouse 점수

---

## 5.5 메일 로그인 (선택)

구글 계정이 없거나 쓰기 싫은 사람을 위해 **메일 링크 로그인**을 붙일 수 있다.
주소만 받고 비밀번호는 안 받는다. 가입과 로그인이 같은 흐름이다.

넷을 다 채워야 켜진다. 하나라도 비면 조용히 꺼지고 구글 로그인만 뜬다.

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=보내는계정@gmail.com
EMAIL_PASS=앱 비밀번호 16자
EMAIL_FROM=들꽃 스터디 <보내는계정@gmail.com>
```

**Gmail 을 쓴다면** 일반 비밀번호가 아니라 **앱 비밀번호**를 만들어야 한다.

1. 구글 계정에 **2단계 인증**을 켠다
2. https://myaccount.google.com/apppasswords 에서 앱 비밀번호 생성
3. 나온 16자를 `EMAIL_PASS` 에 넣는다 (공백은 빼고)

```bash
node lib/check-env.mjs      # '메일 로그인: 켜짐' 이 나와야 한다
node lib/check-email.mjs    # SMTP 연결·인증 확인
node lib/check-email.mjs --send   # 나에게 한 통 보내본다
```

> **앱 비밀번호는 화면에 `xxxx xxxx xxxx xxxx` 로 보인다.** 공백째 복사돼도 스크립트가 걸러내지만,
> 실패하면 `.env.local` 에서 공백을 지운다.

> ⚠️ **값은 `.env.local` 에 넣는다. `.env.local.example` 이 아니다.**
> example 은 공개 repo 에 커밋되는 템플릿이라, 거기 앱 비밀번호를 넣으면 그대로 올라간다.

반만 채웠으면 `check-env` 가 빠진 항목을 짚어준다. 조용히 꺼지는 걸 막으려는 검사다.

Vercel 에도 넷을 넣어야 배포에서 켜진다. `sync-vercel-env.mjs` 가 `.env.local` 을 그대로 밀어 올린다.

---

## 6. Cloudinary 는 나중에

스샷 업로드는 코드가 다 있지만 계정 없이도 배포는 된다.

**계정 생성은 웹으로만 된다.** Cloudinary 계정을 만드는 API 는 없다.
https://cloudinary.com 에서 가입하고 Dashboard 상단의 세 값을 복사한다.

📸 세 값의 **위치**에 화살표를 표시한 스샷 (값은 가린다)

> **API Secret 은 눈 아이콘(Reveal)을 눌러 드러낸 뒤 복사한다.** 가려진 상태로 드래그하면
> `**********` 이 그대로 복사되고 나중에 401 만 뜬다. 복사 아이콘을 쓰는 게 안전하다.
> 실제 값은 27자 내외의 영문+숫자다.

`.env.local` 과 Vercel **양쪽에** 네 개를 넣는다.

```
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME     ← CLOUDINARY_CLOUD_NAME 과 같은 값
```

채웠으면 확인한다. 자격증명뿐 아니라 **서명 업로드를 실제로 한 번 해보고 지운다.**

```bash
node lib/check-cloudinary.mjs
```

가입 이후는 CLI 로도 된다 (`pip install cloudinary-cli` → `cld ping`). 다만 앱은
서명 업로드를 직접 구현해뒀으므로 CLI 가 필요하지 않다.

💥 **Day 9 교보재** — `NEXT_PUBLIC_TEST_SECRET=이건비밀이었다` 를 넣고 배포한 뒤
Sources 에서 검색하면 그대로 나온다. `operator-guide.md` 가 "인상이 가장 강한 실험"으로 꼽은 것이다.
찍고 그 변수는 지운다.

📸 업로드 시 Network 탭의 **3단계 요청 크기 비교** — 큰 파일이 우리 서버를 안 거치는 게 숫자로 보인다

---

## 막히면

| 증상 | 원인 |
|---|---|
| `UntrustedHost` | `auth.js` 의 `trustHost: true` 확인 (이미 넣어뒀다) |
| `redirect_uri_mismatch` | 구글 콘솔에 배포 주소 미등록. 끝 슬래시까지 정확히 |
| `Authentication failed` | Atlas **DB 사용자** 비밀번호다. 계정 비밀번호가 아니다 |
| 배포만 DB 연결 실패 | Vercel 환경변수 누락 / Atlas `0.0.0.0/0` 없음 |
| `SSL alert number 80` / TLS 에러 | **Atlas 가 IP 를 막은 것이다.** 접속 문자열·비밀번호 문제가 아니다. Network Access 에 `0.0.0.0/0` 이 Active 인지 본다. 임시 접근으로 넣으면 6시간 뒤 사라진다 |
| 로그인은 되는데 바로 풀림 | `AUTH_SECRET` 이 로컬과 배포가 다름 |
| `/admin` 이 403 | Atlas 에서 `role` 을 `admin` 으로 안 바꿈 |
| `MissingSecret` | `AUTH_SECRET` 이 비었다. `npx auth secret` 은 쓰지 말 것 (위 3번 참조) |
| `Server error / problem with the server configuration` | Auth.js 가 설정 실패를 뭉뚱그린 화면이다. **진짜 원인은 터미널에** 있다. `check-env` → `check-db` 순으로 보고, 값이 맞는데도 나면 **개발 서버를 껐다 켠다** |

### 설정이 진짜 유효한지 확인하는 법

브라우저 없이 확인된다. 서버를 띄운 뒤:

```bash
curl -s http://localhost:3000/api/auth/providers   # google 이 나와야 한다
curl -s http://localhost:3000/api/auth/csrf        # csrfToken 이 나와야 한다
```

둘 다 정상이면 `AUTH_SECRET` 과 구글 자격증명이 제대로 읽히고 있는 것이다.
