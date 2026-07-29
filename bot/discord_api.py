"""Discord REST 클라이언트. 표준 라이브러리만 쓴다 (pip install 불필요).

게이트웨이를 안 쓰고 REST 폴링만 하므로 GitHub Actions cron에서 돈다.
"""

import json
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://discord.com/api/v10"
MAX_MESSAGE = 2000


class DiscordError(RuntimeError):
    pass


class Discord:
    def __init__(self, token: str, dry_run: bool = False):
        if not token:
            raise DiscordError("DISCORD_BOT_TOKEN 이 비어 있다")
        self.token = token
        self.dry_run = dry_run

    # ---------- 저수준 ----------

    def _req(self, method: str, path: str, body=None, retries: int = 5):
        if self.dry_run:
            return self._dry_req(method, path, body)
        url = path if path.startswith("http") else API + path
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bot {self.token}")
        # discord.py 공식 UA 패턴 — CloudFlare가 봇 패턴으로 차단 안 하는 형식
        req.add_header("User-Agent", "DiscordBot (https://github.com/discord-py, 2.3.2)")
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                raw = res.read()
                return json.loads(raw.decode("utf-8")) if raw else None
        except urllib.error.HTTPError as e:
            payload = e.read().decode("utf-8", "replace")
            if e.code == 429 and retries > 0:
                wait = 1.0
                try:
                    wait = float(json.loads(payload).get("retry_after", 1.0))
                except Exception:
                    pass
                time.sleep(min(wait + 0.5, 30))
                return self._req(method, path, body, retries - 1)
            if e.code in (500, 502, 503, 504) and retries > 0:
                time.sleep(2)
                return self._req(method, path, body, retries - 1)
            raise DiscordError(f"{method} {url} -> {e.code} {payload}") from None

    # ---------- 읽기 ----------

    def messages(self, channel_id: str, after: str | None = None, limit: int = 100):
        """채널/스레드의 메시지를 오래된 것부터 모두 가져온다."""
        out, cursor = [], after
        while True:
            q = {"limit": str(min(limit, 100))}
            if cursor:
                q["after"] = cursor
            batch = self._req("GET", f"/channels/{channel_id}/messages?{urllib.parse.urlencode(q)}")
            if not batch:
                break
            batch.sort(key=lambda m: int(m["id"]))
            out.extend(batch)
            cursor = batch[-1]["id"]
            if len(batch) < 100:
                break
        return out

    def forum_threads(self, guild_id: str, channel_id: str):
        """포럼 채널의 스레드를 활성/보관 모두 모은다."""
        found, seen = [], set()

        active = self._req("GET", f"/guilds/{guild_id}/threads/active") or {}
        for t in active.get("threads", []):
            if str(t.get("parent_id")) == str(channel_id) and t["id"] not in seen:
                seen.add(t["id"])
                found.append(t)

        before = None
        while True:
            q = {"limit": "100"}
            if before:
                q["before"] = before
            page = self._req(
                "GET", f"/channels/{channel_id}/threads/archived/public?{urllib.parse.urlencode(q)}"
            ) or {}
            threads = page.get("threads", [])
            for t in threads:
                if t["id"] not in seen:
                    seen.add(t["id"])
                    found.append(t)
            if not page.get("has_more") or not threads:
                break
            before = threads[-1].get("thread_metadata", {}).get("archive_timestamp")
            if not before:
                break
        return found

    def guild_member(self, guild_id: str, user_id: str):
        try:
            return self._req("GET", f"/guilds/{guild_id}/members/{user_id}")
        except DiscordError:
            return None

    # ---------- 쓰기 ----------

    def send(self, channel_id: str, content: str, allow_mentions: bool = True):
        """2000자를 넘으면 코드펜스를 지켜가며 쪼개 보낸다."""
        sent = []
        for chunk in split_message(content):
            body = {"content": chunk}
            if not allow_mentions:
                body["allowed_mentions"] = {"parse": []}
            if self.dry_run:
                print(f"--- [dry-run] #{channel_id} ---\n{chunk}\n")
                sent.append({"id": "dry-run"})
            else:
                sent.append(self._req("POST", f"/channels/{channel_id}/messages", body))
                time.sleep(0.3)
        return sent

    def create_forum_post(self, channel_id: str, title: str, content: str):
        chunks = split_message(content)
        if self.dry_run:
            print(f"┌─ [dry-run] 포럼 글: {title}")
            print(f"│  {len(chunks)}개 메시지로 나뉨\n")
            for i, c in enumerate(chunks, 1):
                print(f"───── {i}/{len(chunks)} ({len(c)}자) " + "─" * 28)
                print(c)
            print("└" + "─" * 50)
            return {"id": "dry-run"}
        thread = self._req(
            "POST",
            f"/channels/{channel_id}/threads",
            {"name": title[:100], "message": {"content": chunks[0]}},
        )
        for extra in chunks[1:]:
            self._req("POST", f"/channels/{thread['id']}/messages", {"content": extra})
            time.sleep(0.3)
        return thread

    def add_role(self, guild_id: str, user_id: str, role_id: str):
        if self.dry_run:
            print(f"--- [dry-run] role {role_id} -> {user_id}")
            return
        self._req("PUT", f"/guilds/{guild_id}/members/{user_id}/roles/{role_id}")
        time.sleep(0.3)


    def _dry_req(self, method, path, body):
        """[dry-run] 외부 호출 없이 메서드/경로만 찍고 형태만 갖춘 가짜 응답."""
        print(f"  · [dry-run] {method} {path}")
        return {}


def split_message(text: str, limit: int = MAX_MESSAGE):
    """Discord 2000자 제한에 맞춰 자른다. 코드펜스를 가로질러 자르지 않는다."""
    if len(text) <= limit:
        return [text]

    chunks, buf, fence, lang = [], [], False, ""

    def flush():
        if not buf:
            return
        body = "\n".join(buf)
        if fence:
            body += "\n```"
        chunks.append(body)
        buf.clear()

    for line in text.splitlines():
        opening = line.lstrip().startswith("```")
        # 이 줄을 넣으면 넘치는가? (펜스 닫는 4자 여유를 둔다)
        projected = sum(len(x) + 1 for x in buf) + len(line) + (4 if fence else 0)
        if buf and projected > limit:
            flush()
            if fence:
                buf.append(f"```{lang}")
        buf.append(line)
        if opening:
            if fence:
                fence = False
                lang = ""
            else:
                fence = True
                lang = line.lstrip()[3:].strip()
    flush()
    # 한 줄 자체가 limit을 넘는 극단적 경우만 강제로 자른다.
    out = []
    for c in chunks:
        while len(c) > limit:
            out.append(c[:limit])
            c = c[limit:]
        if c:
            out.append(c)
    return out
