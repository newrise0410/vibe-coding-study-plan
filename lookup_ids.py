"""서버의 채널/역할 목록을 이름과 함께 stdout으로 찍는다. 읽기 전용.

    python bot/lookup_ids.py <guild_id>
or
    DISCORD_BOT_TOKEN=... python bot/lookup_ids.py <guild_id>
토큰은 환경변수 또는 하드코딩 둘 다 받는다.
"""
import json
import os
import sys
import urllib.request

# 사용자가 보내준 토큰 (다른 곳엔 쓰지 말 것)
FALLBACK_TOKEN = "<set via DISCORD_BOT_TOKEN env>"


def headers(token: str) -> dict:
    return {"Authorization": f"Bot {token}", "User-Agent": "lookup/1.0"}


def get(path: str, token: str):
    req = urllib.request.Request(f"https://discord.com/api/v10{path}", headers=headers(token))
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8") or "{}")


def main():
    guild = sys.argv[1] if len(sys.argv) > 1 else "1527894994193481898"
    token = os.environ.get("DISCORD_BOT_TOKEN") or FALLBACK_TOKEN

    print(f"# 서버 ID: {guild}\n")

    # --- 채널
    print("## 채널")
    try:
        channels = get(f"/guilds/{guild}/channels", token)
        # 카테고리(4) → 자식 순으로 보기 좋게 정렬
        channels.sort(key=lambda c: (c.get("parent_id") or "", c.get("position", 0)))
        for c in channels:
            kind = {0: "텍스트", 2: "음성", 4: "카테고리", 5: "공지", 15: "포럼"}.get(
                c.get("type"), str(c.get("type"))
            )
            parent = c.get("parent_id")
            print(f"  [{kind:4}] {c['id']}  {c['name']}  (parent={parent})")
    except Exception as e:
        print(f"  !! 채널 목록 실패: {e}")

    # --- 역할
    print("\n## 역할")
    try:
        roles = get(f"/guilds/{guild}/roles", token)
        # 높은 위치 → 낮은 위치 순
        roles.sort(key=lambda r: -r.get("position", 0))
        for r in roles:
            managed = " (관리됨)" if r.get("managed") else ""
            print(f"  {r['id']}  {r['name']}{managed}")
    except Exception as e:
        print(f"  !! 역할 목록 실패: {e}")

    # --- 멤버 (사람만)
    print("\n## 멤버 (사람)")
    try:
        members, after = [], "0"
        while True:
            page = get(f"/guilds/{guild}/members?limit=1000&after={after}", token)
            members.extend(page)
            if len(page) < 1000:
                break
            after = page[-1]["user"]["id"]
        people = [m for m in members if not m["user"].get("bot")]
        for m in sorted(people, key=lambda x: x["user"]["username"].lower()):
            uid = m["user"]["id"]
            name = m.get("nick") or m["user"].get("global_name") or m["user"]["username"]
            print(f"  {uid},{name},{m['user']['username']}")
        print(f"\n  총 {len(people)}명")
    except Exception as e:
        print(f"  !! 멤버 목록 실패: {e}")


if __name__ == "__main__":
    main()
