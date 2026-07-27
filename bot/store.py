"""repo 안에 CSV/JSON으로 기록을 쌓는다. 커밋 이력이 곧 백업이다."""

import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

ROSTER = DATA / "roster.csv"
SUBMISSIONS = DATA / "submissions.csv"
MATRIX = DATA / "matrix.csv"
BADGES = DATA / "badges.csv"
STATE = DATA / "state.json"

SUBMISSION_COLS = [
    "day", "user_id", "name", "thread_id", "message_id",
    "submitted_at", "fields", "flags", "chars",
]


def _read_csv(path: pathlib.Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [dict(r) for r in csv.DictReader(f)]


def _write_csv(path: pathlib.Path, cols: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def load_roster() -> list[dict]:
    """discord_id,name — 운영자가 채운다."""
    rows = [r for r in _read_csv(ROSTER) if (r.get("discord_id") or "").strip()]
    for r in rows:
        r["discord_id"] = r["discord_id"].strip()
        r["name"] = (r.get("name") or "").strip() or r["discord_id"]
    return rows


def load_submissions() -> list[dict]:
    return _read_csv(SUBMISSIONS)


def save_submissions(rows: list[dict]) -> None:
    rows = sorted(rows, key=lambda r: (int(r["day"]), str(r["name"])))
    _write_csv(SUBMISSIONS, SUBMISSION_COLS, rows)


def load_state() -> dict:
    if not STATE.exists():
        return {}
    return json.loads(STATE.read_text(encoding="utf-8"))


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def write_matrix(roster: list[dict], submissions: list[dict]) -> None:
    """사람 × Day 행렬. 운영자가 눈으로 훑는 표."""
    by = {}
    for s in submissions:
        by.setdefault(s["user_id"], {})[int(s["day"])] = s

    cols = ["name"] + [f"D{n}" for n in range(16)] + ["완료수", "마지막인증", "검토필요"]
    rows = []
    for p in sorted(roster, key=lambda r: r["name"]):
        got = by.get(p["discord_id"], {})
        row = {"name": p["name"]}
        needs = 0
        for n in range(16):
            s = got.get(n)
            if not s:
                row[f"D{n}"] = ""
            elif s.get("flags"):
                row[f"D{n}"] = "△"
                needs += 1
            else:
                row[f"D{n}"] = "O"
        row["완료수"] = len(got)
        row["마지막인증"] = max((s["submitted_at"][:10] for s in got.values()), default="")
        row["검토필요"] = needs
        rows.append(row)
    _write_csv(MATRIX, cols, rows)


def write_badges(rows: list[dict]) -> None:
    _write_csv(BADGES, ["name", "user_id", "badge", "awarded_on"], rows)


def load_badges() -> list[dict]:
    return _read_csv(BADGES)
