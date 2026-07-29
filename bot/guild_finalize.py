"""안 정리 단계 — 제안 구조로 추가/조정.

하는 일:
  1) #인증 포럼을 📋 퀘스트 카테고리 안에 새로 만든다
  2) #질문 → #질문과답변: 텍스트 채널을 삭제하고 포럼으로 새로 만든다 (이름 변경 API는 한계)
  3) #운영진: @everyone VIEW 차단 (운영진만 봄)

사용법:
    python bot/guild_finalize.py
"""
import json, os, sys, urllib.error, urllib.request

TOKEN = "<set via DISCORD_BOT_TOKEN env>"
GUILD = "1527894994193481898"

# 첫 빌드에서 얻은 카테고리/채널 ID
CAT_QUEST  = "1531867357641703445"  # 📋 퀘스트
CAT_QNA    = "1531867359088873582"  # ❓ 질문과 답변
CAT_COMMON = "1531867355657932842"  # 📌 공통

CH_QUESTION_OLD = "1531867371222863987"   # 지금 텍스트 #질문
CH_OPS          = "1531867377871093951"   # 운영진


def req(method, path, body=None):
    url = f"https://discord.com/api/v10{path}"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bot {TOKEN}")
    r.add_header("User-Agent", "DiscordBot (https://github.com/discord-py, 2.3.2)")
    if data is not None:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read()
            return res.status, json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"{method} {path} -> {e.code} {payload}") from None


def main():
    print("## 1) #인증 포럼 생성 (📋 퀘스트 안)")
    code, ch = req("POST", f"/guilds/{GUILD}/channels", {
        "name": "인증",
        "type": 15,                        # 포럼
        "parent_id": CAT_QUEST,
        "topic": "1인 1 thread · 답글로 매일 인증. '최근 활동순'으로 정렬하면 그게 이탈 대시보드다.",
    })
    print(f"   → {code}  인증 ID = {ch['id']}")
    CERT_ID = ch["id"]

    print("\n## 2) #질문 → #질문과답변 포럼")
    # 기존 텍스트 #질문 삭제
    try:
        code = req("DELETE", f"/channels/{CH_QUESTION_OLD}")
        # DELETE는 200 + 채널 객체
        print(f"   구 #질문 삭제: {code}")
    except Exception as e:
        print(f"   구 #질문 삭제 실패(무시 가능, 이미 없을 수 있음): {str(e)[:120]}")

    code, ch = req("POST", f"/guilds/{GUILD}/channels", {
        "name": "질문과답변",
        "type": 15,
        "parent_id": CAT_QNA,
        "topic": "❓ 15분 룰: 15분 넘게 막히면 여기. 답변은 그 thread에서.",
    })
    print(f"   → {code}  질문과답변 ID = {ch['id']}")
    QNA_ID = ch["id"]

    print("\n## 3) #운영진 권한: @everyone VIEW 차단")
    # Discord에서 @everyone role id == guild id
    code, body = req("PATCH", f"/channels/{CH_OPS}", {
        "permission_overwrites": [
            {
                "id": GUILD,         # @everyone
                "type": 0,
                "allow": "0",
                "deny":  "1024",     # VIEW_CHANNEL
            }
        ],
    })
    print(f"   → {code}  운영진 권한 패치")

    print("\n## 결과 — config.json에 들어갈 매핑")
    print('"channels": {')
    print(f'  "quest":    "1531867369968763110",  // #퀘스트 (그대로)')
    print(f'  "cert":     "{CERT_ID}",            // #인증 (포럼, ★새로)')
    print(f'  "question": "{QNA_ID}",             // #질문과답변 (포럼, ★새로)')
    print(f'  "ops":      "{CH_OPS}"              // #운영진')
    print("}")


if __name__ == "__main__":
    main()
