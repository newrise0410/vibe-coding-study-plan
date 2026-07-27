"""봇이 하는 네 가지 일."""

import json
from datetime import datetime, timezone

import curriculum
import parser as P
import schedule as S
import store

BADGE_RULES = [
    ("🌱 새싹", range(1, 6)),
    ("🌿 줄기", range(6, 11)),
    ("🌳 나무", range(11, 16)),
]


def _iso(ts: str) -> str:
    return (ts or "")[:19]


def _today(cfg):
    return S.kst_now(cfg["schedule"]["timezone_offset_hours"]).date()


# ---------------------------------------------------------------- 인증 수집

def sync(dc, cfg, state):
    """#인증 포럼의 모든 스레드를 훑어 인증을 파싱하고 기록한다."""
    guild = cfg["guild_id"]
    cert = cfg["channels"]["cert"]
    roster = store.load_roster()
    by_id = {p["discord_id"]: p for p in roster}
    min_chars = cfg["thresholds"]["core_min_chars"]
    core_map = cfg["day_core_fields"]

    existing = {(r["user_id"], r["day"]): r for r in store.load_submissions()}
    cursors = state.setdefault("cursors", {})
    fresh_flagged = []

    threads = dc.forum_threads(guild, cert)
    print(f"  스레드 {len(threads)}개")

    for th in threads:
        tid = th["id"]
        msgs = dc.messages(tid, after=cursors.get(tid))
        if msgs:
            cursors[tid] = msgs[-1]["id"]
        for m in msgs:
            if m.get("author", {}).get("bot"):
                continue
            parsed = P.parse(m.get("content", ""))
            if not parsed:
                continue
            uid = m["author"]["id"]
            person = by_id.get(uid)
            if not person:
                print(f"  ! 명단에 없는 사람: {uid} ({m['author'].get('username')})")
                continue

            day = parsed["day"]
            core = core_map.get(str(day), [])
            flags = P.review(parsed, core, min_chars)
            key = (uid, str(day))
            row = {
                "day": day,
                "user_id": uid,
                "name": person["name"],
                "thread_id": tid,
                "message_id": m["id"],
                "submitted_at": _iso(m["timestamp"]),
                "fields": "|".join(sorted(parsed["fields"])),
                "flags": "; ".join(flags),
                "chars": len(m.get("content", "")),
            }
            # 같은 Day를 다시 올리면 최신 것으로 갱신한다 (되돌려보낸 뒤 재제출).
            prev = existing.get(key)
            existing[key] = row
            if flags and (not prev or prev.get("message_id") != m["id"]):
                fresh_flagged.append(row)

    rows = list(existing.values())
    store.save_submissions(rows)
    store.write_matrix(roster, rows)
    print(f"  인증 누적 {len(rows)}건, 이번에 검토 필요 {len(fresh_flagged)}건")
    return fresh_flagged


def report_flagged(dc, cfg, flagged):
    """되돌려보낼 후보를 #운영진에 올린다. 판단과 DM은 사람이 한다."""
    if not flagged:
        return
    lines = ["**검토 필요한 인증** — 해부·부숴보기가 비었거나 형식적입니다.", ""]
    for r in flagged:
        link = f"https://discord.com/channels/{cfg['guild_id']}/{r['thread_id']}/{r['message_id']}"
        lines.append(f"- **{r['name']}** Day {r['day']} — {r['flags']}\n  {link}")
    lines += [
        "",
        "> 되돌려보낼 땐 톤을 가볍게. "
        "\"다시 하세요\"가 아니라 \"이거 되게 재밌으니까 이것만 해보고 오세요\".",
    ]
    dc.send(cfg["channels"]["ops"], "\n".join(lines), allow_mentions=False)


# ---------------------------------------------------------------- 이탈 감지

def absence(dc, cfg, state):
    """이틀 이상 조용한 사람을 찾아 #운영진에 띄운다. DM은 운영자가 직접."""
    day1 = S.parse_date(cfg["schedule"]["day1_date"])
    today = _today(cfg)
    limit = cfg["thresholds"]["absent_days"]

    if S.latest_day(day1, today) < 1:
        print("  아직 시작 전")
        return

    roster = store.load_roster()
    subs = store.load_submissions()
    last_by = {}
    for s in subs:
        d = s["submitted_at"][:10]
        if d and d > last_by.get(s["user_id"], ""):
            last_by[s["user_id"]] = d

    buckets = {}
    for p in roster:
        last = last_by.get(p["discord_id"])
        if last:
            gap = S.scheduled_days_between(day1, S.parse_date(last), today)
        else:
            gap = S.latest_day(day1, today) + 1  # 한 번도 안 냄
        if gap >= limit:
            buckets.setdefault(gap, []).append((p, last))

    if not buckets:
        print("  조용한 사람 없음")
        return

    # 같은 사람에게 같은 단계로 두 번 알리지 않는다.
    notified = state.setdefault("absence_notified", {})
    lines, count = ["**조용한 사람** — 2일차 DM이 운영자가 하는 가장 중요한 행동입니다.", ""], 0
    for gap in sorted(buckets, reverse=True):
        for p, last in sorted(buckets[gap], key=lambda x: x[0]["name"]):
            if notified.get(p["discord_id"]) == gap:
                continue
            notified[p["discord_id"]] = gap
            tail = f"마지막 인증 {last}" if last else "**한 번도 안 냄**"
            lines.append(f"- **{p['name']}** — {gap}일 미제출 ({tail})")
            count += 1

    if not count:
        print("  새로 알릴 사람 없음")
        return
    lines += [
        "",
        "> 안부가 아니라 구체적인 질문으로: "
        "\"Day 7 DB 연결에서 막히셨어요? 터미널 에러 스샷만 주시면 볼게요\"",
    ]
    dc.send(cfg["channels"]["ops"], "\n".join(lines), allow_mentions=False)
    print(f"  {count}명 알림")


# ---------------------------------------------------------------- 뱃지

def badges(dc, cfg, state):
    """구간을 다 채우면 역할을 붙인다. 🔨 해체왕은 재량이라 사람이 준다."""
    guild = cfg["guild_id"]
    roles = cfg["roles"]
    subs = store.load_submissions()
    roster = store.load_roster()
    today = _today(cfg).isoformat()

    done = {}
    for s in subs:
        done.setdefault(s["user_id"], set()).add(int(s["day"]))

    awarded = {(b["user_id"], b["badge"]) for b in store.load_badges()}
    rows = store.load_badges()
    new = []

    for p in roster:
        uid = p["discord_id"]
        got = done.get(uid, set())
        for badge, span in BADGE_RULES:
            if (uid, badge) in awarded:
                continue
            if all(d in got for d in span):
                role_id = roles.get(badge.split()[0]) or roles.get(badge)
                if role_id:
                    try:
                        dc.add_role(guild, uid, role_id)
                    except Exception as e:  # 역할 부여 실패가 기록을 막지 않게
                        print(f"  ! 역할 부여 실패 {p['name']} {badge}: {e}")
                rows.append({"name": p["name"], "user_id": uid, "badge": badge, "awarded_on": today})
                new.append((p["name"], badge))

    # 🔦 등대 — #질문에서 남의 글에 답한 횟수
    if cfg["channels"].get("question") and roles.get("🔦"):
        counts = _answer_counts(dc, cfg)
        need = cfg["thresholds"]["lighthouse_answers"]
        for p in roster:
            uid = p["discord_id"]
            if (uid, "🔦 등대") in awarded or counts.get(uid, 0) < need:
                continue
            try:
                dc.add_role(guild, uid, roles["🔦"])
            except Exception as e:
                print(f"  ! 역할 부여 실패 {p['name']} 등대: {e}")
            rows.append({"name": p["name"], "user_id": uid, "badge": "🔦 등대", "awarded_on": today})
            new.append((p["name"], "🔦 등대"))

    store.write_badges(rows)
    if new:
        body = "\n".join(f"- {n} → {b}" for n, b in new)
        dc.send(cfg["channels"]["ops"], f"**뱃지 부여**\n{body}", allow_mentions=False)
    print(f"  신규 뱃지 {len(new)}건")


def _answer_counts(dc, cfg):
    """#질문에서 '남의 글에 답한' 횟수. 휴리스틱이라 운영자가 덮어써도 된다."""
    ch = cfg["channels"]["question"]
    counts = {}
    for m in dc.messages(ch, after=None):
        if m.get("author", {}).get("bot"):
            continue
        ref = m.get("referenced_message")
        if ref and ref.get("author", {}).get("id") != m["author"]["id"]:
            counts[m["author"]["id"]] = counts.get(m["author"]["id"], 0) + 1
    for th in dc.forum_threads(cfg["guild_id"], ch) or []:
        owner = th.get("owner_id")
        for m in dc.messages(th["id"]):
            uid = m.get("author", {}).get("id")
            if uid and uid != owner and not m["author"].get("bot"):
                counts[uid] = counts.get(uid, 0) + 1
    return counts


# ---------------------------------------------------------------- 퀘스트 게시

def quest(dc, cfg, state):
    """오늘 Day의 커리큘럼 섹션을 #퀘스트에 올리고 스레드를 연다."""
    day1 = S.parse_date(cfg["schedule"]["day1_date"])
    today = _today(cfg)
    day = S.current_day(day1, today)
    if day is None:
        print("  오늘은 퀘스트 없는 날 (주말이거나 기간 밖)")
        return

    posted = state.setdefault("quest_posted", {})
    if str(day) in posted:
        print(f"  Day {day} 는 이미 게시됨")
        return

    body = curriculum.quest_post(day, today.isoformat(), cfg.get("repo_url"))
    title = f"[Day {day}] {curriculum.section(day)[0]}"
    res = dc.create_forum_post(cfg["channels"]["quest"], title, body)
    posted[str(day)] = {"thread_id": res.get("id"), "on": today.isoformat()}
    print(f"  Day {day} 게시 완료")
