"""curriculum/*.md 에서 그날 퀘스트 섹션을 그대로 떼어온다."""

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

FILES = {0: "curriculum/day-00-setup.md"}
for _n in range(1, 6):
    FILES[_n] = "curriculum/week-1.md"
for _n in range(6, 11):
    FILES[_n] = "curriculum/week-2.md"
for _n in range(11, 16):
    FILES[_n] = "curriculum/week-3.md"

# 다음 Day 제목이나 주차 체크포인트를 만나면 섹션이 끝난다.
END_RE = re.compile(r"^#\s+Day\s+\d+\b|^##\s+.*체크포인트", re.M)


def section(day: int) -> tuple[str, str]:
    """(제목, 본문). 본문은 앞뒤 구분선을 털어낸 상태."""
    path = ROOT / FILES[day]
    text = path.read_text(encoding="utf-8")

    start_re = re.compile(rf"^#\s+Day\s+{day}\b.*$", re.M)
    m = start_re.search(text)
    if not m:
        raise ValueError(f"Day {day} 섹션을 {path} 에서 못 찾음")

    title = m.group(0).lstrip("#").strip()
    rest = text[m.end():]
    end = END_RE.search(rest)
    body = rest[: end.start()] if end else rest

    body = re.sub(r"\n---\s*\n---\s*\n?", "\n", body)
    return title, body.strip()


def quest_post(day: int, date_str: str, repo_url: str | None = None) -> str:
    """#퀘스트에 올릴 본문."""
    title, body = section(day)
    head = f"# {title}\n`{date_str}`\n"
    if repo_url:
        head += f"\n원문: {repo_url}/blob/master/{FILES[day]}\n"
    return f"{head}\n{body}"
