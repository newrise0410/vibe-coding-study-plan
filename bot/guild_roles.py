"""서버에 뱃지 역할 4개 만들기. 봇은 Administrator 가 아니라서 서버 역할 생성에
특별 권한이 필요할 수 있다 — 실패하면 누가 손으로 만든다.

    python bot/guild_roles.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

BADGES = [
    ("🌱 새싹", 0x4ade80),  # 초록
    ("🌿 줄기", 0x84cc16),  # 연두
    ("🌳 나무", 0x16a34a),  # 진한 초록
    ("🔦 등대", 0xfacc15),  # 노랑
]

FALLBACK_TOKEN = "<set via DISCORD_BOT_TOKEN env>"
GUILD = "1527894994193481898"


def req(method, path, token, body=None):
    url = f"https://discord.com/api/v10{path}"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bot {token}")
    r.add_header("User-Agent", "guild-roles/1.0")
    if data is not None:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"{method} {url} -> {e.code} {payload}") from None


def main():
    token = os.environ.get("DISCORD_BOT_TOKEN") or FALLBACK_TOKEN
    # 기존 역할 목록 — 이미 있으면 만들지 않는다
    current = req("GET", f"/guilds/{GUILD}/roles", token)
    by_name = {r["name"]: r for r in current}

    print("## 뱃지 역할 생성")
    for name, color in BADGES:
        if name in by_name:
            print(f"  · 이미 있음 {name} = {by_name[name]['id']}")
            continue
        try:
            res = req("POST", f"/guilds/{GUILD}/roles", token, {
                "name": name, "color": color,
                "mentionable": False, "hoist": False,
            })
            print(f"  ✓ {name} = {res['id']}")
        except Exception as e:
            print(f"  ! {name} 실패: {e}")

    print("\n## 최종 역할 목록 (뱃지만)")
    final = req("GET", f"/guilds/{GUILD}/roles", token)
    badge_ids = {}
    for r in sorted(final, key=lambda x: -x["position"]):
        if r["name"] in {n for n, _ in BADGES}:
            print(f"  {r['id']}  {r['name']}")
            for n, _ in BADGES:
                if r["name"] == n:
                    badge_ids[n.split()[0]] = r["id"]
    print("\n## config.json roles 매핑")
    print(json.dumps(badge_ids, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
