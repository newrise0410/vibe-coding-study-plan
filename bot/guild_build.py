"""서버를 깨끗이 비우고 README 패턴으로 다시 빌드한다.

사용법:
    python bot/guild_build.py reset       # 14개 모두 삭제
    python bot/guild_build.py build       # README 패턴으로 새로 생성 (카테고리 + 채널)
    python bot/guild_build.py all         # reset → build 한 번에

읽기/쓰기 모두 봇 토큰 + 매니저 권한이 있어야 한다 (Administrator = 모든 권한).
"""
import json
import os
import sys
import urllib.error
import urllib.request

# 채널 ID는 lookup_ids.py 결과에서 그대로 가져옴
CHANNELS_TO_WIPE = [
    # 일반 텍스트
    "1529385820702642221",  # announcements
    "1529385822988796094",  # welcome
    "1529385824486166659",  # general
    # 포럼
    "1529385826109227151",  # 퀘스트-공지
    "1529386437248553011",  # 퀘스트-결과
    "1529385828155916341",  # 질문과답변
    "1529385829653413922",  # 학습자료
    "1529385831662620752",  # 자유토론
    # 카테고리
    "1529385761215086692",  # 📌 공통
    "1529385762737492040",  # 📋 퀘스트
    "1529385763920154668",  # ❓ 질문과 답변
    "1529385765828558953",  # 📖 학습 자료
    "1529385767015546992",  # 💬 자유 이야기
]

# 새 구조 (README 패턴)
NEW_CATEGORIES = [
    {"name": "📌 공통",      "id_target": "common"},
    {"name": "📋 퀘스트",    "id_target": "quest"},
    {"name": "❓ 질문과 답변", "id_target": "qna"},
    {"name": "📖 학습 자료",  "id_target": "learn"},
    {"name": "💬 자유 이야기", "id_target": "free"},
]

# (이름, 타입, 카테고리 키, 토픽)
# type 0 = 텍스트, 15 = 포럼, 4 = 카테고리(이건 따로 만듦)
NEW_CHANNELS = [
    ("announcements", 0,  "common", "운영 공지"),
    ("welcome",       0,  "common", "환영합니다"),
    ("general",       0,  "common", "자유 잡담"),
    ("퀘스트",         15, "quest",  "🎯 오늘의 퀘스트 결과물을 올려주세요"),
    ("질문",           0,  "qna",    "15분 룰: 15분 넘게 막히면 여기"),
    ("학습자료",       0,  "learn",  "강의자료, 외부 링크"),
    ("자랑",           0,  "free",   "완성물, 뚫은 이야기, 카톡 미리보기"),
    ("잡담",           0,  "free",   "이탈 방지용"),
    ("운영진",         0,  "common", "봇이 조용한 사람/검토 필요 인증을 올리는 채널"),
]

FALLBACK_TOKEN = "<set via DISCORD_BOT_TOKEN env>"
GUILD = "1527894994193481898"


def req(method: str, path: str, token: str, body=None):
    url = f"https://discord.com/api/v10{path}"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bot {token}")
    r.add_header("User-Agent", "guild-build/1.0")
    if data is not None:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as e:
        payload = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"{method} {url} -> {e.code} {payload}") from None


def reset(token: str):
    print("## 리셋: 14개 채널/카테고리 삭제")
    for cid in CHANNELS_TO_WIPE:
        try:
            req("DELETE", f"/channels/{cid}", token)
            print(f"  ✓ {cid} 삭제")
        except Exception as e:
            msg = str(e)
            if "404" in msg:
                print(f"  · {cid} 이미 없음")
            else:
                print(f"  ! {cid} 실패: {msg[:120]}")


def build(token: str):
    print("\n## 빌드: README 패턴으로 카테고리 + 채널 생성")
    cat_ids = {}
    for cat in NEW_CATEGORIES:
        res = req("POST", f"/guilds/{GUILD}/channels", token, {
            "name": cat["name"], "type": 4,
        })
        cat_ids[cat["id_target"]] = res["id"]
        print(f"  ✓ 카테고리 [{cat['name']}] = {res['id']}")

    for name, kind, parent_key, topic in NEW_CHANNELS:
        body = {"name": name, "type": kind, "parent_id": cat_ids[parent_key]}
        if topic:
            body["topic"] = topic
        res = req("POST", f"/guilds/{GUILD}/channels", token, body)
        kind_label = {0: "텍스트", 15: "포럼"}[kind]
        print(f"  ✓ {kind_label} #{name} = {res['id']}  ({topic or '-'})")

    # 결과 한눈에
    print("\n## 매핑 (config.json 에 그대로 복사)")
    print('"channels": {')
    print(f'  "quest":     "TODO: 퀘스트 포럼 ID",')
    print(f'  "cert":      "TODO: 퀘스트 포럼 ID (cert와 같게)",')
    print(f'  "question":  "TODO: #질문 채널 ID",')
    print(f'  "ops":       "TODO: #운영진 채널 ID"')
    print("}")
    print(f"\n카테고리 ID 매핑: {json.dumps(cat_ids, ensure_ascii=False)}")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("reset", "build", "all"):
        print(__doc__)
        return 1
    token = os.environ.get("DISCORD_BOT_TOKEN") or FALLBACK_TOKEN
    if sys.argv[1] in ("reset", "all"):
        reset(token)
    if sys.argv[1] in ("build", "all"):
        build(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
