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


def load_config():
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    missing = [k for k in ("guild_id",) if not cfg.get(k)]
    missing += [f"channels.{k}" for k, v in cfg["channels"].items() if not v and k != "question"]
    if missing:
        raise SystemExit(f"config.json 을 먼저 채우세요. 비어 있음: {', '.join(missing)}")
    return cfg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["sync", "daily", "quest", "absence", "badges", "all"])
    ap.add_argument("--dry-run", action="store_true", help="Discord에 아무것도 안 쓰고 출력만")
    args = ap.parse_args()

    cfg = load_config()
    token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token and not args.dry_run:
        raise SystemExit("DISCORD_BOT_TOKEN 이 없습니다")
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
                tasks.quest(dc, cfg, state)
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
