"""토큰 / 봇 가용성 진단. 짧게 결과만 보여준다."""
import json
import os
import urllib.error
import urllib.request

FALLBACK_TOKEN = "<set via DISCORD_BOT_TOKEN env>"
GUILD = "1527894994193481898"


def req(method, path, token):
    r = urllib.request.Request(f"https://discord.com/api/v10{path}", method=method)
    r.add_header("Authorization", f"Bot {token}")
    r.add_header("User-Agent", "DiscordBot (https://github.com/discord-py, 2.3.2)")
    try:
        with urllib.request.urlopen(r, timeout=15) as res:
            return res.status, json.loads(res.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:300]


def main():
    token = os.environ.get("DISCORD_BOT_TOKEN") or FALLBACK_TOKEN
    print("## 진단\n")

    code, me = req("GET", "/users/@me", token)
    print(f"  1. /users/@me → {code}")
    if code == 200:
        print(f"     봇: {me.get('username')}#{me.get('discriminator')} id={me.get('id')}")
    else:
        print(f"     응답: {me}")
        return

    code, guild = req("GET", f"/guilds/{GUILD}", token)
    print(f"  2. /guilds/{GUILD} → {code}")
    if isinstance(guild, dict):
        print(f"     서버: {guild.get('name')} (멤버 {guild.get('approximate_member_count')})")
    else:
        print(f"     응답: {str(guild)[:300]}")
    return

    code, channels = req("GET", f"/guilds/{GUILD}/channels", token)
    if isinstance(channels, list):
        print(f"  3. /guilds/{GUILD}/channels → {code}, {len(channels)}개")
        for c in channels[:5]:
            print(f"     - {c['name']} ({c['id']})")
    else:
        print(f"  3. /guilds/{GUILD}/channels → {code}")
        print(f"     응답: {channels[:300]}")


if __name__ == "__main__":
    main()
