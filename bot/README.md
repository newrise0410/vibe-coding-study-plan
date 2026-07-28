# 들꽃 스터디 봇

GitHub Actions cron으로 도는 Discord 봇. 서버가 필요 없고 기록은 이 repo의 `data/`에 CSV로 쌓인다.

**봇은 감지만 하고 DM은 보내지 않는다.** `resources/operator-guide.md`가 2일차 DM을 가장 중요한 행동으로
꼽는 이유는 그게 "구체적인 질문을 담은 개인 메시지"라서다. 봇이 자동 DM을 쏘면 그 효과가 정확히 사라진다.
봇은 `#운영진`에 "이 사람들 조용함"까지만 올린다.

## 하는 일

| 명령 | 언제 | 무엇을 |
|---|---|---|
| `sync` | 매시 정각 | `#인증` 스레드를 훑어 파싱 → `data/` 갱신 → 해부·부숴보기 빈 인증을 `#운영진`에 보고 |
| `quest` | 평일 09:00 KST | 그날 Day 섹션을 `curriculum/`에서 떼어 `#퀘스트`에 포럼 글로 게시 |
| `absence` | 매일 22:00 KST | 2일 이상 조용한 사람을 `#운영진`에 보고 |
| `badges` | 매일 22:00 KST | 🌱🌿🌳 자동 역할 부여, 🔦 등대는 답변 3회 이상 |

`daily` = quest + sync + absence + badges. 🔨 해체왕은 재량이라 사람이 준다.

## 설치

### 1. 봇 만들기

1. https://discord.com/developers/applications → `New Application`
2. **Bot** 탭 → `Reset Token` → 토큰 복사
3. **Bot** 탭에서 **MESSAGE CONTENT INTENT를 켠다.** ← 이거 안 켜면 인증 내용이 빈 문자열로 온다
4. **OAuth2 → URL Generator** → scope `bot` → 권한:
   `View Channels`, `Send Messages`, `Create Public Threads`, `Send Messages in Threads`,
   `Read Message History`, `Manage Roles`
5. 나온 URL로 서버에 초대

> **Manage Roles 주의**: 봇의 역할이 🌱🌿🌳🔦 역할들보다 **위**에 놓여야 부여가 된다.
> 서버 설정 → 역할에서 봇 역할을 위로 끌어올린다.

### 2. ID 채우기

Discord에서 **설정 → 고급 → 개발자 모드**를 켜면 우클릭으로 ID 복사가 된다.
`bot/config.json`에 채운다.

```json
{
  "guild_id": "서버 우클릭 → ID 복사",
  "repo_url": "https://github.com/내계정/vibe-coding-study-plan",
  "channels": {
    "quest": "#퀘스트 (포럼 채널)",
    "cert":  "#인증 (포럼 채널)",
    "question": "#질문 (없으면 빈 문자열)",
    "ops":   "#운영진"
  },
  "roles": { "🌱": "역할 ID", "🌿": "...", "🌳": "...", "🔦": "..." },
  "schedule": { "day1_date": "2026-08-03", "timezone_offset_hours": 9 }
}
```

`day1_date`는 **Day 1의 날짜**다. Day 0은 자동으로 3일 전, Day 2~15는 주말을 건너뛰며 평일로 배정된다.

`#퀘스트`와 `#인증`은 **포럼(Forum) 채널**로 만든다. `#인증`은 참가자 1인당 게시글 1개를 파고
매일 자기 글에 답글로 인증을 단다. 포럼을 "최근 활동순"으로 정렬하면 그게 곧 이탈 대시보드다.

### 3. 명단 채우기

`data/roster.csv`. 명단에 없는 사람의 인증은 무시된다 (로그에 남는다).

```csv
discord_id,name
123456789012345678,홍길동
234567890123456789,김철수
```

### 4. 토큰 등록

repo → Settings → Secrets and variables → Actions → `New repository secret`
- 이름 `DISCORD_BOT_TOKEN`, 값은 1번에서 복사한 토큰

### 5. 확인

Actions 탭 → `study-bot` → `Run workflow` → command `sync`, dry_run **체크**.
Discord에 아무것도 안 쓰고 로그만 찍는다. 정상이면 dry_run을 풀고 다시 돌린다.

## 로컬에서 돌려보기

```bash
python bot/test_parser.py     # 인증 포맷 파서 (Discord 불필요)
python bot/test_e2e.py        # 가짜 Discord로 전체 경로 (Discord 불필요)

DISCORD_BOT_TOKEN=xxx python bot/main.py sync --dry-run
```

파이썬 3.11+, 외부 패키지 없음(표준 라이브러리만).

## 나오는 파일

| 파일 | 내용 |
|---|---|
| `data/submissions.csv` | 인증 1건 = 1행. 어떤 필드를 냈는지, 검토 사유는 뭔지 |
| `data/matrix.csv` | **사람 × Day 행렬.** `O` 정상 / `△` 검토필요 / 빈칸 미제출 |
| `data/badges.csv` | 뱃지 부여 이력 |
| `data/state.json` | 커서·중복방지 상태. 손대지 말 것 |

`matrix.csv`가 운영자가 매일 볼 표다. 3주 뒤 이 파일이 그대로 다음 기수 자료가 된다 —
Day별 완료율, 난이도 절벽이 진짜 Day 6·12–13이었는지, 어디서 사람이 빠졌는지.

## 조정할 만한 것

`config.json`의 `thresholds`:

- `core_min_chars` (기본 12) — 해부·부숴보기가 이보다 짧으면 검토 대상. 오탐이 많으면 낮춘다
- `absent_days` (기본 2) — 며칠 조용하면 보고할지
- `lighthouse_answers` (기본 3) — 🔦 등대 기준

`day_core_fields`는 Day마다 어떤 칸을 필수로 볼지다. Day 0은 해부가 없고, Day 15는 회고라 둘 다 없다.

## 알아둘 것

- **cron은 UTC다.** 워크플로의 `0 0 * * 1-5`가 09:00 KST다. 시간을 바꾸려면 9를 빼서 계산한다
- GitHub Actions 스케줄은 **기본 브랜치에서만** 돈다. 그리고 몇 분 늦을 수 있다 (정시 보장 아님)
- 봇이 `data/`를 커밋한다. `GITHUB_TOKEN` 푸시는 워크플로를 다시 트리거하지 않으니 무한루프는 안 난다
- private repo면 Actions 무료 한도(월 2000분)를 쓴다. 매시 sync면 월 500분 안쪽이라 여유 있다
- 인증을 다시 올리면 그 Day 기록이 최신 것으로 갱신된다 (되돌려보낸 뒤 재제출 대응)
- 🔦 등대 집계는 휴리스틱이다. `data/badges.csv`를 손으로 고쳐도 된다
