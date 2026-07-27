"""파서 검증. curriculum에 실제로 적힌 인증 포맷을 그대로 넣어본다.

    python bot/test_parser.py
"""

import sys
import pathlib

# Windows 콘솔(cp949)에서도 한글·이모지가 깨지지 않게.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import parser as P  # noqa: E402

fails = []


def check(name, cond, detail=""):
    if cond:
        print(f"  PASS  {name}")
    else:
        print(f"  FAIL  {name}  {detail}")
        fails.append(name)


print("\n[1] Day 7 — README.md 의 표준 포맷")
d7 = P.parse("""[Day 7] 완료
■ 해부: lib/mongodb.js 14번째 줄 globalThis 캐시
■ 부숴보기: B 했더니 배포만 DB 연결 실패, 로컬은 멀쩡
■ 답: 3문항 다 씀
■ 막혔던 것: 비밀번호 특수문자""")
check("day=7", d7 and d7["day"] == 7, d7)
check("해부 파싱", d7["fields"].get("해부") == ["lib/mongodb.js 14번째 줄 globalThis 캐시"])
check("막혔던 것 파싱", "막혔던 것" in d7["fields"])

print("\n[2] Day 1 — week-1.md, '■ 막혔던 것' 에 콜론이 없다")
d1 = P.parse("""[Day 1] 완료
■ 해부: link 7줄 / script 24줄, head 3~9 body 10~30
■ 부숴보기: A와 D 둘 다 흑백인데 D는 404가 뜸
■ 스샷: CSS를 지운 상태의 화면
■ 답: 3문항
■ 막혔던 것""")
check("콜론 없는 라벨 인식", "막혔던 것" in d1["fields"], d1["fields"].keys())
check("값은 빈 문자열", d1["fields"]["막혔던 것"] == [""])

print("\n[3] Day 3 — 이모지가 붙은 헤더 + 사이트 주소")
d3 = P.parse("""[Day 3] 완료 🌱
■ 내 사이트: https://dulkkot-store.vercel.app
■ 해부: 요청 12개 / 전송량 340kB / 640px에서 깨짐
■ 부숴보기: A는 진짜 폰으로, B는 Style.css로 바꿔 푸시했더니 배포만 404
■ 스샷: 핸드폰 화면 + Network 탭
■ 답: 3문항""")
check("이모지 헤더에서 day=3", d3 and d3["day"] == 3, d3)
check("사이트 필드", d3["fields"].get("사이트") == ["https://dulkkot-store.vercel.app"])

print("\n[4] Day 7 — '■ 해부:' 가 두 번 나오는 경우")
dup = P.parse("""[Day 7] 완료
■ 해부: Atlas 화면과 /api/products JSON이 같은 데이터
■ 해부: globalThis 캐시는 연결을 재사용해서 커넥션 폭증을 막는다
■ 부숴보기: B 필수 되돌리기까지 완료
■ 답: 3문항""")
check("해부 2개 수집", len(dup["fields"]["해부"]) == 2, dup["fields"]["해부"])

print("\n[5] Day 0 — 해부 칸이 아예 없는 날")
d0 = P.parse("""[Day 0] 완료
■ 계정: GitHub / Vercel / Atlas / Cloudinary / 포트원 — 다 됨
■ 스샷: 안녕 나는 여기 있다
■ 부숴보기: A 했더니 글씨가 작아짐
■ 답: 2·3번 추측 적음
■ 사용 OS: Windows""")
check("day=0", d0["day"] == 0)
check("해부 없음", "해부" not in d0["fields"])
check("사용 OS 파싱", d0["fields"].get("사용 OS") == ["Windows"])

print("\n[6] 되돌려보내기 판정 — 핵심 칸이 빈 인증")
empty = P.parse("""[Day 8] 완료
■ 해부:
■ 부숴보기: 없음
■ 답: 3문항 다 했어요
■ 막혔던 것: 없음""")
flags = P.review(empty, ["해부", "부숴보기"], 12)
check("해부·부숴보기 둘 다 잡힘", len(flags) == 2, flags)
check("막혔던 것의 '없음'은 안 잡음", all("막혔" not in f for f in flags), flags)

print("\n[7] 안내문을 그대로 붙여넣은 경우")
tmpl = P.parse("""[Day 2] 완료
■ 해부: (찾아낸 것 — 파일명과 줄 번호까지)
■ 부숴보기: B, D 필수 그대로 다 해봤고 점 빼니까 스타일이 통째로 날아감
■ 답: 3문항""")
f2 = P.review(tmpl, ["해부", "부숴보기"], 12)
check("괄호 안내문은 짧음으로 잡힘", any("해부" in f for f in f2), f2)
check("제대로 쓴 부숴보기는 통과", all("부숴보기" not in f for f in f2), f2)

print("\n[8] 정상 인증은 플래그 0개")
good = P.parse("""[Day 13] 완료
■ 해부: app/api/payments/complete/route.js 41줄에서 금액 대조, 멱등은 58줄
■ 해부: Vercel 로그에 웹훅 수신 기록 확인
■ 부숴보기: A에서 100원으로 조작했는데 서버가 거부하고 PENDING 유지됨
■ 뚫린 게 있었나: C 가짜 웹훅이 200으로 통과해서 서명 검증 추가함
■ 답: 4문항""")
check("플래그 없음", P.review(good, ["해부", "부숴보기"], 12) == [], P.review(good, ["해부", "부숴보기"], 12))

print("\n[9] 인증이 아닌 글은 무시")
check("잡담 무시", P.parse("오늘 Day 7 하다가 막혔어요 도와주세요") is None)
check("빈 글 무시", P.parse("") is None)
check("Day 99 무시", P.parse("[Day 99] 완료") is None)

print("\n[10] 코드블록이 섞인 인증")
fenced = P.parse("""[Day 8] 완료
■ 해부: 검증은 lib/validate.js 12~30줄, 화이트리스트는 34줄
■ 부숴보기: 콘솔에서 이렇게 보냈더니 400이 왔다
```js
await fetch('/api/products', { method: 'POST' })
```
■ 답: 3문항""")
check("코드블록 뒤 필드 복구", "답" in fenced["fields"], fenced["fields"].keys())
check("코드블록이 부숴보기 값에 포함", "fetch" in fenced["fields"]["부숴보기"][0])

print()
if fails:
    print(f"실패 {len(fails)}건: {fails}")
    sys.exit(1)
print("전부 통과")
