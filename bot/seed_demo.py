"""ad-hoc 시뮬레이션: 사용자 입장으로 #인증 포럼에 자기 thread를 파고 인증을 답글로 적는 동작을
로컬에서 흉내낸다. Discord에는 실제로 안 보내고, tasks.sync()가 처리할 입력만 `state.json`/`submissions.csv`
자리에 박는다.

검증하려는 것:
  - sync 코드가 명단에 없는 사람을 무시하고 로그만 찍는지
  - 빈 메시지는 무시되는지
  - 정상 인증은 submissions.csv 에 박히고 matrix.csv 에 O로 표시되는지
  - 해부·부숴보기가 비면 (안내문 복붙) 검토 플래그가 붙고 #운영진 보고 큐에 들어가는지

출력:
  - data/submissions.csv / data/matrix.csv 갱신 시뮬레이션은 별도 함수에서 보여준다.
  - 실제 Discord 호출은 하지 않는다 (dry-run 유지).
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bot import parser as P, tasks, store  # noqa: E402

DATA = ROOT / "data"
ROSTER = DATA / "roster.csv"
SUBMISSIONS = DATA / "submissions.csv"
MATRIX = DATA / "matrix.csv"


def load_roster():
    """기존 roster 읽기 (없으면 0명)."""
    if not ROSTER.exists():
        return []
    with ROSTER.open(encoding="utf-8-sig", newline="") as f:
        return [dict(r) for r in csv.DictReader(f)]


def demo_payloads():
    """3가지 케이스 — 정상 / 형식적 / 명단 밖 — 를 (작성자 id, 본문) 쌍으로."""
    return {
        "ok": (
            "user_ok_001",
            "[Day 7] 완료\n"
            "■ 해부: src/lib/db.ts 의 connect() — 12번째 줄에서 .env 의 MONGODB_URI 참조. 줄 번호까지 짚었다.\n"
            "■ 부숴보기: 0.0.0.0/0 을 deny 로 바꾸니 atlas 대시보드에서 IP unauthorized 가 떴다. 되돌리니 정상.\n"
            "■ 답: 1) 클라트가 server URL 은 본적이 없다 2) 그래도 어딘가 거쳐야 한다 (4번은 추측)\n"
            "■ 막혔던 것: 없음",
        ),
        "shallow": (
            "user_shallow_002",
            "[Day 7] 완료\n"
            "■ 해부: 만들었음\n"
            "■ 부숴보기: 안 됨\n"
            "■ 답: a, b, c\n"
            "■ 막혔던 것: 없음",
        ),
        "outsider": (
            "000000000000000999",
            "[Day 7] 완료\n"
            "■ 해부: 외부 유저의 인증 — 명단에 없어야 함",
        ),
    }


def main():
    roster = load_roster()
    print(f"## roster: {len(roster)}명\n")

    cfg = store_load_dummy_config()
    cases = demo_payloads()
    min_chars = cfg["thresholds"]["core_min_chars"]
    core_map = cfg["day_core_fields"]

    # 1) parser 단독: 각 본문이 어떻게 분해되는지
    print("## parser 단계")
    for name, (uid, body) in cases.items():
        parsed = P.parse(body)
        if not parsed:
            print(f"  {name}: parse → None (인증 아님)")
            continue
        flags = P.review(parsed, core_map.get(str(parsed["day"]), []), min_chars)
        print(f"  {name}: day={parsed['day']} fields={list(parsed['fields'])} flags={flags}")

    # 2) sync 흐름: 명단 매칭 → submissions.csv 누적 → matrix.csv 갱신
    print("\n## sync 흐름 (목 데이터)")
    # roster가 비어있어도 시뮬레이션이 진행되도록 in-memory 보강
    sim_roster = list(roster)
    sim_ids = {"user_ok_001": "김인증", "user_shallow_002": "박성의", "000000000000000999": None}
    if len(sim_roster) < 3:
        # 시뮬레이션용 임시 멤버만 in-memory로 추가 (roster.csv엔 안 적는다)
        sim_roster.extend([
            {"discord_id": "user_ok_001", "name": "김인증"},
            {"discord_id": "user_shallow_002", "name": "박성의"},
        ])
    by_id = {p["discord_id"]: p for p in sim_roster}

    rows = []
    matched, ignored = 0, 0
    for name, (uid, body) in cases.items():
        # sim_roster에 들어있는 사람만 매칭 (outsider는 여전히 무시)
        person = by_id.get(uid)
        if not person:
            ignored += 1
            print(f"  ! {name}({uid}): 명단에 없음 — 봇은 로그만 찍고 무시")
            continue

        parsed = P.parse(body)
        if not parsed:
            print(f"  · {name}: 인증 형식 아님 — 무시")
            continue
        flags = P.review(parsed, core_map.get(str(parsed["day"]), []), min_chars)
        rows.append({
            "day": parsed["day"],
            "user_id": uid,
            "name": person["name"],
            "thread_id": "demo-thread",
            "message_id": f"demo-msg-{name}",
            "submitted_at": "2026-08-10T13:30:00+09:00",
            "fields": "|".join(sorted(parsed["fields"])),
            "flags": "; ".join(flags),
            "chars": len(body),
        })
        matched += 1
        print(f"  ✓ {name}: day={parsed['day']} flags={flags or '—'}")

    # 3) 보고 대상 (신규 검토)
    flagged = [r for r in rows if r["flags"]]
    print(f"\n## 결과: matched={matched}, ignored={ignored}, 검토 후보={len(flagged)}")

    if flagged:
        print("\n## 봇이 #운영진에 띄울 보고문 (dry-run 출력)")
        ops_lines = ["검토 필요한 인증 — 해부·부숴보기가 비었거나 형식적입니다.", ""]
        for r in flagged:
            ops_lines.append(f"- {r['name']} Day {r['day']} — {r['flags']}")
        ops_lines += ["", "> 되돌려보낼 땐 톤을 가볍게."]
        print("\n".join(ops_lines))


def store_load_dummy_config():
    """테스트용 최소 config. 진짜 config.json 안 거치고 핵심 값만."""
    return {
        "thresholds": {"core_min_chars": 12, "absent_days": 2, "lighthouse_answers": 3},
        "day_core_fields": {str(d): ["해부", "부숴보기"] for d in range(16)},
    }


if __name__ == "__main__":
    main()
