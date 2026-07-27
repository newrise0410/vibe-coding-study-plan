"""Day 번호 ↔ 날짜 변환.

주 5일 × 3주 = 15일. 주말은 밀린 걸 따라잡는 날이라 Day를 배정하지 않는다.
Day 0은 '시작 3일 전' 준비일이라 Day 1의 3일 전으로 잡는다.
"""

from datetime import date, datetime, timedelta, timezone

WEEKEND = (5, 6)  # 토, 일


def kst_now(offset_hours: int = 9) -> datetime:
    return datetime.now(timezone(timedelta(hours=offset_hours)))


def parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def day_to_date(day1: date, day: int) -> date:
    """Day N의 날짜. Day 1부터 평일만 세어 나간다."""
    if day == 0:
        return day1 - timedelta(days=3)
    d, remaining = day1, day - 1
    while remaining > 0:
        d += timedelta(days=1)
        if d.weekday() not in WEEKEND:
            remaining -= 1
    return d


def schedule_map(day1: date) -> dict[int, date]:
    return {n: day_to_date(day1, n) for n in range(0, 16)}


def current_day(day1: date, today: date) -> int | None:
    """오늘이 몇 번째 Day인가. 주말·기간 밖이면 None."""
    for n, d in schedule_map(day1).items():
        if d == today:
            return n
    return None


def latest_day(day1: date, today: date) -> int:
    """오늘까지 공개된 마지막 Day. 주말이면 직전 평일 Day를 준다."""
    passed = [n for n, d in schedule_map(day1).items() if d <= today]
    return max(passed) if passed else -1


def scheduled_days_between(day1: date, start: date, end: date) -> int:
    """두 날짜 사이에 낀 '퀘스트가 있는 날' 수. 이탈 판정에 쓴다."""
    return len([d for d in schedule_map(day1).values() if start < d <= end])
