"""들꽃 스터디 봇 진입점.

    python bot/main.py sync
    python bot/main.py daily
    python bot/main.py quest --dry-run

DISCORD_BOT_TOKEN 환경변수가 필요하다 (--dry-run 이면 없어도 된다).
"""

import argparse
import json
import os
import pathlib
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import discord_api  # noqa: E402
import store  # noqa: E402
import tasks  # noqa: E402

CONFIG = pathlib.Path(__file__).parent / "config.json"


def read_config():
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def load_config(dry_run: bool = False):
    cfg = read_config()
    if dry_run:
        # 미리보기는 진짜 ID 없이도 돌아야 한다.
        cfg["guild_id"] = cfg.get("guild_id") or "DRYRUN_GUILD"
        for k, v in cfg["channels"].items():
            if not v:
                cfg["channels"][k] = f"DRYRUN_{k}"
        return cfg
    missing = [k for k in ("guild_id",) if not cfg.get(k)]
    missing += [f"channels.{k}" for k, v in cfg["channels"].items() if not v and k != "question"]
    if missing:
        raise SystemExit(f"config.json 을 먼저 채우세요. 비어 있음: {', '.join(missing)}")
    return cfg


def cmd_check(args):
    """인증 한 건을 넣어보고 어떻게 판정되는지 본다. Discord도 config도 필요 없다."""
    import parser as P

    if args.file:
        text = pathlib.Path(args.file).read_text(encoding="utf-8")
    elif args.text:
        text = args.text
    else:
        print("인증 내용을 붙여넣고 Ctrl+Z(Windows) 또는 Ctrl+D(Mac/Linux):\n")
        text = sys.stdin.read()

    cfg = read_config()
    parsed = P.parse(text)
    if not parsed:
        print("\n인증이 아님 — '[Day N] 완료' 헤더를 못 찾았습니다.")
        return 1

    day = parsed["day"]
    core = cfg["day_core_fields"].get(str(day), [])
    flags = P.review(parsed, core, cfg["thresholds"]["core_min_chars"])

    print(f"\nDay {day}   필수 칸: {', '.join(core) if core else '(없음)'}")
    print("-" * 52)
    for key, values in parsed["fields"].items():
        for v in values:
            mark = " " if v.strip() else "!"
            body = v.replace("\n", " ⏎ ")
            print(f" {mark} {key:<8} {body[:60]}{'…' if len(body) > 60 else ''}")
    print("-" * 52)
    if flags:
        print("검토 필요:")
        for f in flags:
            print(f"  - {f}")
        print("\n→ #운영진에 보고됩니다. 되돌려보낼지는 사람이 정합니다.")
    else:
        print("통과 — 검토 대상 아님")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "command", choices=["sync", "daily", "quest", "absence", "badges", "all", "check"]
    )
    ap.add_argument("--dry-run", action="store_true", help="Discord에 아무것도 안 쓰고 출력만")
    ap.add_argument("--day", type=int, help="quest: 특정 Day를 미리 봄 (--dry-run과 함께)")
    ap.add_argument("--file", help="check: 인증이 담긴 파일")
    ap.add_argument("--text", help="check: 인증 내용을 인자로 직접")
    args = ap.parse_args()

    if args.command == "check":
        raise SystemExit(cmd_check(args))

    cfg = load_config(args.dry_run)
    token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token and not args.dry_run:
        raise SystemExit("DISCORD_BOT_TOKEN 이 없습니다")
    # dry-run은 단순한 echo 디버그. 환경변수가 없으면 "dry-run-token" 더미를 넣고
    # Discord._req 의 dry_run 분기에서 모든 호출을 stdout 출력으로 대체한다.
    dc = discord_api.Discord(token or "dry-run-token", dry_run=args.dry_run)

    state = store.load_state()
    run = {
        "sync": ["sync"],
        "quest": ["quest"],
        "absence": ["absence"],
        "badges": ["badges"],
        "daily": ["quest", "sync", "absence", "badges"],
        "all": ["quest", "sync", "absence", "badges"],
    }[args.command]

    failed = []
    for step in run:
        print(f"[{step}]")
        try:
            if step == "sync":
                tasks.report_flagged(dc, cfg, tasks.sync(dc, cfg, state))
            elif step == "quest":
                tasks.quest(dc, cfg, state, day=args.day)
            elif step == "absence":
                tasks.absence(dc, cfg, state)
            elif step == "badges":
                tasks.badges(dc, cfg, state)
        except Exception as e:
            # 한 단계가 죽어도 나머지는 돌리고, 상태는 저장한다.
            print(f"  !! {step} 실패: {e}")
            failed.append(step)

    if not args.dry_run:
        store.save_state(state)

    if failed:
        raise SystemExit(f"실패한 단계: {', '.join(failed)}")


if __name__ == "__main__":
    main()
