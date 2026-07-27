"""가짜 Discord로 sync → absence → badges 전체 경로를 돌려본다.

    python bot/test_e2e.py

실제 Discord에 붙지 않는다. data/ 도 건드리지 않고 임시 폴더에서 돈다.
"""

import json
import pathlib
import shutil
import sys
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import schedule as S  # noqa: E402
import store  # noqa: E402

# store가 쓰는 경로를 임시 폴더로 돌린다.
TMP = pathlib.Path(tempfile.mkdtemp(prefix="studybot-"))
store.DATA = TMP
store.ROSTER = TMP / "roster.csv"
store.SUBMISSIONS = TMP / "submissions.csv"
store.MATRIX = TMP / "matrix.csv"
store.BADGES = TMP / "badges.csv"
store.STATE = TMP / "state.json"

import tasks  # noqa: E402

fails = []


def check(name, cond, detail=""):
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + ("" if cond else f"  {detail}"))
    if not cond:
        fails.append(name)


def cert(day, body):
    return f"[Day {day}] 완료\n{body}"


GOOD = "■ 해부: lib/mongodb.js 14줄 globalThis 캐시 확인\n■ 부숴보기: B 했더니 배포만 연결 실패\n■ 답: 3문항"
EMPTY = "■ 해부:\n■ 부숴보기: 없음\n■ 답: 했어요"


class FakeDiscord:
    """스레드 2개, 참가자 2명 분량의 최소 서버."""

    def __init__(self):
        self.sent = []
        self.roles = []
        self.dry_run = False
        # 아영: Day 1~5 전부 정상 → 🌱 받아야 함. 준호: Day 1만, 그것도 빈 인증.
        self._msgs = {
            "th_a": [
                {"id": f"m{d}", "author": {"id": "u1", "username": "ayoung"},
                 "timestamp": f"2026-08-{2+d:02d}T10:00:00+00:00", "content": cert(d, GOOD)}
                for d in range(1, 6)
            ],
            "th_b": [
                {"id": "n1", "author": {"id": "u2", "username": "junho"},
                 "timestamp": "2026-08-03T10:00:00+00:00", "content": cert(1, EMPTY)},
                {"id": "n2", "author": {"id": "u2", "username": "junho"},
                 "timestamp": "2026-08-03T11:00:00+00:00", "content": "그냥 잡담입니다"},
                {"id": "n3", "author": {"id": "u9", "username": "stranger"},
                 "timestamp": "2026-08-03T12:00:00+00:00", "content": cert(2, GOOD)},
            ],
        }

    def forum_threads(self, guild, channel):
        if channel == "cert":
            return [{"id": "th_a", "owner_id": "u1"}, {"id": "th_b", "owner_id": "u2"}]
        return []

    def messages(self, channel_id, after=None, limit=100):
        msgs = self._msgs.get(channel_id, [])
        if after:
            msgs = [m for m in msgs if m["id"] > after]
        return msgs

    def send(self, channel_id, content, allow_mentions=True):
        self.sent.append((channel_id, content))
        return [{"id": "sent"}]

    def add_role(self, guild, user, role):
        self.roles.append((user, role))

    def create_forum_post(self, channel_id, title, content):
        self.sent.append((channel_id, f"[FORUM] {title}"))
        return {"id": "new_thread"}


CFG = {
    "guild_id": "g1",
    "repo_url": "https://github.com/x/y",
    "channels": {"quest": "quest", "cert": "cert", "question": "", "ops": "ops"},
    "roles": {"🌱": "r_seed", "🌿": "r_stem", "🌳": "r_tree", "🔦": "r_light"},
    "schedule": {"day1_date": "2026-08-03", "timezone_offset_hours": 9},
    "thresholds": {"core_min_chars": 12, "absent_days": 2, "lighthouse_answers": 3},
    "day_core_fields": {str(d): (["해부", "부숴보기"] if 1 <= d <= 14 else []) for d in range(16)},
}
CFG["day_core_fields"]["0"] = ["부숴보기"]

store.ROSTER.write_text("discord_id,name\nu1,아영\nu2,준호\n", encoding="utf-8-sig")

dc = FakeDiscord()
state = {}

print("\n[1] sync — 인증 파싱과 명단 대조")
flagged = tasks.sync(dc, CFG, state)
subs = store.load_submissions()
check("정상 인증 5건 + 빈 인증 1건 = 6건", len(subs) == 6, [s["day"] for s in subs])
check("명단에 없는 stranger는 제외", all(s["user_id"] != "u9" for s in subs))
check("잡담은 인증으로 안 셈", all(s["message_id"] != "n2" for s in subs))
check("빈 인증 1건이 검토 대상", len(flagged) == 1, flagged)
check("검토 사유에 해부·부숴보기", "해부" in flagged[0]["flags"] and "부숴보기" in flagged[0]["flags"],
      flagged[0]["flags"] if flagged else "")

print("\n[2] 커서 — 두 번째 sync는 중복을 만들지 않는다")
tasks.sync(dc, CFG, state)
check("여전히 6건", len(store.load_submissions()) == 6, len(store.load_submissions()))

print("\n[3] matrix — 사람×Day 행렬")
rows = list(store._read_csv(store.MATRIX))
ayoung = next(r for r in rows if r["name"] == "아영")
junho = next(r for r in rows if r["name"] == "준호")
check("아영 D1~D5 = O", all(ayoung[f"D{d}"] == "O" for d in range(1, 6)),
      [ayoung[f"D{d}"] for d in range(1, 6)])
check("준호 D1 = △ (검토필요)", junho["D1"] == "△", junho["D1"])
check("아영 완료수 5", ayoung["완료수"] == "5", ayoung["완료수"])

print("\n[4] report_flagged — 운영진 채널로만 나간다")
dc.sent.clear()
tasks.report_flagged(dc, CFG, flagged)
check("ops로 1건 발송", len(dc.sent) == 1 and dc.sent[0][0] == "ops", dc.sent)
check("메시지에 준호와 링크 포함",
      "준호" in dc.sent[0][1] and "discord.com/channels" in dc.sent[0][1])

print("\n[5] absence — 조용한 사람 감지 (DM이 아니라 보고)")
CFG["schedule"]["day1_date"] = "2026-08-03"
import datetime as _dt
# Day 6(월). 아영은 금요일 Day 5까지 냈으니 1일 미제출 → 아직 안 잡혀야 한다.
# 주말이 끼어도 '퀘스트가 있는 날'만 세기 때문에 금→월이 1일로 계산된다.
tasks._today = lambda cfg: _dt.date(2026, 8, 10)
dc.sent.clear()
tasks.absence(dc, CFG, state)
check("ops로 보고됨", len(dc.sent) == 1 and dc.sent[0][0] == "ops", dc.sent)
check("준호가 조용한 사람으로 잡힘", "준호" in dc.sent[0][1], dc.sent[0][1] if dc.sent else "")
check("아영은 안 잡힘 (주말은 안 셈)", "아영" not in dc.sent[0][1], dc.sent[0][1] if dc.sent else "")

print("\n[6] absence 중복 방지 — 같은 단계로 두 번 안 알린다")
dc.sent.clear()
tasks.absence(dc, CFG, state)
check("두 번째 호출은 조용", len(dc.sent) == 0, dc.sent)

print("\n[7] badges — 🌱 자동 부여")
dc.sent.clear()
dc.roles.clear()
tasks.badges(dc, CFG, state)
check("아영에게 새싹 역할", ("u1", "r_seed") in dc.roles, dc.roles)
check("준호는 못 받음", not any(u == "u2" for u, _ in dc.roles), dc.roles)
awarded = store.load_badges()
check("뱃지 기록 1건", len(awarded) == 1 and awarded[0]["name"] == "아영", awarded)

print("\n[8] badges 멱등 — 두 번 돌려도 중복 부여 안 함")
dc.roles.clear()
tasks.badges(dc, CFG, state)
check("역할 재부여 없음", dc.roles == [], dc.roles)
check("기록도 그대로 1건", len(store.load_badges()) == 1, len(store.load_badges()))

print("\n[9] quest — 주말엔 안 올리고, 같은 날 두 번 안 올린다")
dc.sent.clear()
tasks._today = lambda cfg: _dt.date(2026, 8, 8)  # 토요일
tasks.quest(dc, CFG, state)
check("주말엔 미게시", len(dc.sent) == 0, dc.sent)
tasks._today = lambda cfg: _dt.date(2026, 8, 3)  # Day 1
tasks.quest(dc, CFG, state)
check("평일엔 게시", len(dc.sent) == 1 and "[FORUM]" in dc.sent[0][1], dc.sent)
tasks.quest(dc, CFG, state)
check("같은 날 재게시 안 함", len(dc.sent) == 1, dc.sent)

print("\n[10] schedule — 주말 건너뛰기")
d1 = S.parse_date("2026-08-03")  # 월요일
check("Day 5 = 8/7 금요일", S.day_to_date(d1, 5) == _dt.date(2026, 8, 7), S.day_to_date(d1, 5))
check("Day 6 = 8/10 월요일 (주말 건너뜀)", S.day_to_date(d1, 6) == _dt.date(2026, 8, 10),
      S.day_to_date(d1, 6))
check("Day 15 = 8/21 금요일", S.day_to_date(d1, 15) == _dt.date(2026, 8, 21), S.day_to_date(d1, 15))
check("Day 0 = 7/31 (3일 전)", S.day_to_date(d1, 0) == _dt.date(2026, 7, 31), S.day_to_date(d1, 0))

shutil.rmtree(TMP, ignore_errors=True)
print()
if fails:
    print(f"실패 {len(fails)}건: {fails}")
    sys.exit(1)
print("전부 통과")
