"""인증 글 파서.

curriculum의 인증 포맷은 Day마다 필드가 다르고, 콜론이 빠지는 줄도 있다.
그래서 `[Day N] 완료`만 앵커로 삼고 `■` 줄을 관대하게 긁는다.

    [Day 7] 완료
    ■ 해부: (찾아낸 것 — 파일명과 줄 번호까지)
    ■ 부숴보기: 무엇을 망가뜨렸더니 → 무엇이 어떻게 됐다
    ■ 답: (스스로 답하기 3문항)
    ■ 막혔던 것: 한 줄 (없으면 '없음')
"""

import re
import unicodedata

# `[Day 7] 완료`, `[Day 3] 완료 🌱`, `[ Day 13 ] 완료` 를 모두 받는다.
DAY_RE = re.compile(r"\[\s*day\s*(\d{1,2})\s*\]\s*완료", re.IGNORECASE)

# 불릿은 ■ 를 쓰지만 참가자가 다른 걸 쓸 수 있으니 흔한 것들을 함께 받는다.
BULLET_RE = re.compile(r"^\s*[■◾▪️▪◼◻□•\-\*]\s*(?P<rest>.+?)\s*$")

# 코드펜스 안의 내용은 필드로 착각하면 안 된다.
FENCE_RE = re.compile(r"^\s*```")

# 값이 사실상 비었다고 볼 자리표시자.
PLACEHOLDER = {
    "", "-", "—", "–", ".", "..", "...", "x", "X", "ㅇ", "ㅁ", "?", "??",
    "없음", "없슴", "없었음", "패스", "생략", "n/a", "na", "tbd", "todo",
}

# curriculum 인증 블록의 안내문을 그대로 붙여넣은 경우.
# operator-guide.md 가 '복붙'을 위험 신호로 잡는 그 항목이다.
TEMPLATE_ECHO = {
    _t.replace(" ", "") for _t in [
        "무엇을 망가뜨렸더니 → 무엇이 어떻게 됐다",
        "한 줄 (없으면 '없음')",
        "찾아낸 것 — 파일명과 줄 번호까지",
        "스스로 답하기 3문항",
        "3문항", "4문항", "3문항 (3번은 내일의 예고편)", "3문항 (3번이 내일의 주제)",
        "B, D 필수", "A, B 필수", "A, D 필수", "A, C 필수", "C, D 필수",
        "A 또는 B 결과", "A~D 전부", "A, B, C, D 전부",
    ]
}


def _norm_label(raw: str) -> str:
    """라벨을 비교 가능한 형태로 정규화한다."""
    s = unicodedata.normalize("NFKC", raw)
    s = re.sub(r"[\s:：\-—–_/]+", "", s)
    return s.lower()


def canonical_field(label: str) -> str:
    """라벨을 표준 키로 접는다. 모르는 라벨은 정규화형 그대로 둔다."""
    n = _norm_label(label)
    if "해부" in n:
        return "해부"
    if "부숴" in n or "부수" in n or "깨보" in n:
        return "부숴보기"
    if n.startswith("답") or "스스로답" in n:
        return "답"
    if "막혔" in n or "막힌" in n:
        return "막혔던 것"
    if "스샷" in n or "스크린샷" in n or "캡처" in n:
        return "스샷"
    if "뚫" in n:
        return "뚫린 것"
    if "사이트" in n or "주소" in n or "배포" in n:
        return "사이트"
    if "계정" in n:
        return "계정"
    if n.startswith("사용os") or n == "os":
        return "사용 OS"
    return n


def is_blank(value: str) -> bool:
    """자리표시자만 있거나 아예 비었으면 True."""
    v = (value or "").strip()
    if not v:
        return True
    stripped = re.sub(r"[()（）\[\]{}]", "", v).strip()
    return stripped.lower() in PLACEHOLDER


def is_template_echo(value: str) -> bool:
    """curriculum 안내문을 그대로 옮겨 붙였는지 본다."""
    v = (value or "").strip()
    if not v:
        return False
    # 값 전체가 괄호로 감싸여 있으면 안내문이다. 실제 답은 이렇게 안 쓴다.
    if re.fullmatch(r"[(（].+[)）]", v, flags=re.S):
        return True
    return v.replace(" ", "") in TEMPLATE_ECHO


def parse(content: str):
    """인증 글 하나를 파싱한다.

    인증이 아니면 None, 맞으면 {"day": int, "fields": {키: [값...]}} 을 준다.
    같은 라벨이 두 번 나오는 Day(7·9·10·11 등)를 위해 값은 리스트다.
    """
    if not content:
        return None
    m = DAY_RE.search(content)
    if not m:
        return None
    day = int(m.group(1))
    if not 0 <= day <= 15:
        return None

    fields: dict[str, list[str]] = {}
    current: str | None = None
    in_fence = False

    # 헤더 줄 다음부터 훑는다.
    tail = content[m.end():]
    for line in tail.splitlines():
        if FENCE_RE.match(line):
            in_fence = not in_fence
            if current:
                fields[current][-1] += "\n" + line
            continue

        if in_fence:
            if current:
                fields[current][-1] += "\n" + line
            continue

        bm = BULLET_RE.match(line)
        if bm:
            rest = bm.group("rest")
            # 콜론이 없을 수도 있다: `■ 막혔던 것`
            parts = re.split(r"[:：]", rest, maxsplit=1)
            label = parts[0]
            value = parts[1] if len(parts) > 1 else ""
            key = canonical_field(label)
            fields.setdefault(key, []).append(value.strip())
            current = key
        elif current:
            fields[current][-1] += "\n" + line.strip()

    return {"day": day, "fields": {k: [v.strip() for v in vs] for k, vs in fields.items()}}


def review(parsed, required_core, min_chars: int):
    """핵심 칸(해부·부숴보기)이 실하게 채워졌는지 본다.

    되돌려보낼지는 사람이 정한다. 여기서는 근거만 만든다.
    """
    flags = []
    fields = parsed["fields"]
    for key in required_core:
        values = fields.get(key)
        if not values:
            flags.append(f"{key} 칸 없음")
            continue
        real = [v for v in values if not is_blank(v) and not is_template_echo(v)]
        if not real:
            if any(is_template_echo(v) for v in values):
                flags.append(f"{key} 안내문 그대로")
            else:
                flags.append(f"{key} 비어 있음")
            continue
        merged = " ".join(real).strip()
        if len(merged) < min_chars:
            flags.append(f"{key} 너무 짧음 ({len(merged)}자)")
    return flags
