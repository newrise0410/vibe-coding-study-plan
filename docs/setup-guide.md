# 스터디 봇 셋업 가이드

처음 서버를 띄울 때 한 번 따라가면 다음 기수 때도 그대로 따라할 수 있는 문서.

## 0단계 — 토큰과 환경

(워크플로 자동화 + 로컬 dry-run이 같이 도는 경우 다음 두 가지가 필요)

- Discord 봇 토큰 (디스코드 개발자 포털 → App → Bot → Reset Token)
- GitHub Actions 리포의 Secrets → `DISCORD_BOT_TOKEN`

## 1단계 — Discord 서버 만들기

서버 우클릭 → "서버 ID 복사" → `bot/config.json`의 `guild_id`에 박는다.

## 2단계 — 채널 빌드 (헬퍼 스크립트 일괄)

이 리포에는 서버를 처음부터 다시 만드는 데 필요한 5개 스크립트가 들어 있다. **모두 Python 표준 라이브러리만 쓴다 (pip install 없음).**

```
lookup_ids.py     # 서버의 채널/역할/멤버 목록을 찍는다 (read-only 진단)
guild_build.py    # 채널 14개 + 카테고리 5개를 README 패턴으로 새로 만든다
guild_finalize.py # #인증 포럼 추가 + #질문을 #질문과답변 포럼으로 교체 + #운영진 권한 차단
guild_roles.py    # 🌱🌿🌳🔦 4개 역할 생성
diag.py           # 토큰·의도·권한 진단 (3단계 진단 한 번에)
```

처음부터 만들 때 순서:

```
python lookup_ids.py              # 비어있으면 "채널 없음" → 다음으로
python guild_build.py all         # reset → build
python guild_finalize.py          # #인증 추가, #질문과답변, #운영진 권한
python guild_roles.py             # 4개 역할 생성
python diag.py                    # 200 OK 확인
```

각 스크립트는 결과로 나오는 ID를 stdout 마지막에 찍어주니까 그대로 `bot/config.json`에 복사하면 된다.

### 빌드 결과로 만들어지는 서버 구조

```
[우드] AI 리더스 커뮤니티
├── 📌 공통
│   ├── #announcements   운영 공지
│   ├── #welcome         환영합니다
│   ├── #general         자유 잡담
│   └── #운영진          [🔒 @everyone VIEW 차단]
├── 📋 퀘스트
│   ├── #퀘스트          [포럼] 오늘의 퀘스트 결과물
│   └── #인증            [포럼] 1인 1 thread
├── ❓ 질문과 답변
│   └── #질문과답변      [포럼] 15분 룰
├── 📖 학습 자료
│   └── #학습자료        강의자료
└── 💬 자유 이야기
    ├── #자랑            완성물·뚫은 이야기
    └── #잡담            자유 토크
```

## 3단계 — bot/config.json 채우기

| 키 | 받는 법 |
|---|---|
| `guild_id` | 서버 우클릭 → ID 복사 |
| `channels.quest` | `#퀘스트` 포럼 우클릭 → ID |
| `channels.cert` | `#인증` 포럼 우클릭 → ID |
| `channels.question` | `#질문과답변` 포럼 우클릭 → ID |
| `channels.ops` | `#운영진` 우클릭 → ID |
| `roles.🌱/🌿/🌳/🔦` | 역할 우클릭 → ID |
| `repo_url` | 본 리포의 GitHub 주소 |

## 4단계 — Discord 의도 켜기

App → Bot → Privileged Gateway Intents:
- MESSAGE CONTENT INTENT ✅ (안 켜면 인증 본문이 빈 문자열로 옴)
- SERVER MEMBERS INTENT ✅ (안 켜면 /guilds/{id}/members, /threads/active 가 401)

이후 **Bot 탭 → Reset Token** 으로 토큰을 새로 받아야 의도가 적용된다. 예전 토큰은 무효.

## 5단계 — 봇 초대

OAuth2 → URL Generator:
- SCOPES: `bot`
- PERMISSIONS: View Channels, Send Messages, Create Public Threads, Send Messages in Threads, Read Message History, Manage Roles

URL로 서버에 초대 후, **서버 설정 → 역할**에서 봇 역할을 ⭐ 🌱🌿🌳🔦 역할보다 위로 드래그.

## 6단계 — 명단 (`data/roster.csv`)

```csv
discord_id,name
123456789012345678,홍길동
234567890123456789,김철수
```

명단에 없는 사람의 인증은 무시되고 로그만 찍힌다 (`print(f"  ! 명단에 없는 사람: …")`).

수업 시작 전 7일 정도에 `(github.com/리포)/actions → study-bot → Run workflow → command=sync, dry_run=true`로 한 번 시험 돌리고 OK면 풀면 좋다.

## 7단계 — 로컬에서 dry-run

```
python bot/test_parser.py     # 파서 단위 10/10 통과 확인
python bot/test_e2e.py        # 전체 경로 10/10 통과 확인
python bot/main.py sync --dry-run
python bot/main.py quest --dry-run --day 7
```

`--dry-run`은 Discord에 안 쓰고 stdout에만 본문을 찍는다.

## 8단계 — GitHub Actions로 전환

리포의 `.github/workflows/study-bot.yml`:
- `0 * * * *` = 매시 정각 sync (인증 수집)
- `0 0 * * 1-5` = 09:00 KST 평일 quest
- `0 13 * * *` = 22:00 KST 매일 absence + badges

Secrets에 `DISCORD_BOT_TOKEN`이 박혀있으면 OK. **직접 workflow_dispatch 로 dry_run=true로 한 번 돌려보고 이상 없으면 dry_run 풀고 다시.**

워크플로가 data/를 commit·push 하므로 같은 리포의 커밋 이력이 곧 백업.

## 9단계 — 일일 운영 (10~15분)

봇이 자동으로:
- 09:00 KST 평일 → `#퀘스트` 에 그날 Day 포럼 글
- 매시 정각 → `#인증` 포럼 훑어서 인증 파싱
- 22:00 KST → 2일+ 미제출자 `#운영진` 보고, 🌱🌿🌳🔦 부여

봇은 **DM을 보내지 않는다**. 2일차 DM은 운영자가 직접. 톤 가볍게, "어디서 막히셨어요? 스샷만 보내주세요" 가이드.

## 트러블슈팅

| 증상 | 원인 | 진단 |
|---|---|---|
| `401 Unauthorized` | 토큰 무효 또는 MESSAGE CONTENT 안 켜짐 | `python bot/diag.py` |
| `403 error code 1010` | 비표준 User-Agent → CloudFlare 차단 | `bot/discord_api.py` UA 가 `DiscordBot (https://github.com/discord-py, 2.3.2)` 인지 확인 |
| `403` on `/guilds/{id}/members` | SERVER MEMBERS INTENT 안 켜짐 | 봇 탭 → 의도 → Reset Token |
| `#운영진` 에 못 씀 | `@everyone` VIEW 차단된 채널에 봇이 들어가지 못함 (Administrator면 OK) | 서버 설정 → 역할 → 봇 역할에 Administrator ✅ |
| `data/state.json` 잘못 들어감 | 수동으로 reset 하려면 한 줄 지우기 | `python bot/seed_demo.py`로 dry 검증부터 |

## 트러블 디버그 — 항상 dry-run부터

`--dry-run`은 Discord 쓰기 없이 stdout에 결과를 찍는다. cron 띄우기 전에 로컬에서:

```
python bot/main.py daily --dry-run
```

이걸로 quest → sync → absence → badges 4단계가 모두 통과하면 Actions cron만 켜면 끝.
