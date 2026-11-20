"""Prepare the public daily quote without exposing the DeepSeek API key."""

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
QUOTE_FILE = Path("memo/daily-quote.json")
PROMPT = (
    "给中文个人手账网站「拾日」写一句原创的每日寄语。"
    "用具体、自然、克制的中文，像朋友留在便签上的一句话。"
    "可以写休息、专注、好奇或生活里的小细节。"
    "只返回一句话，15 到 45 个汉字，不要标题、引号、署名、表情符号或名言。"
)


def read_json(request):
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read(32_000))


def existing_quote(page_url, day):
    if not page_url:
        return None
    try:
        payload = read_json(f"{page_url.rstrip('/')}/daily-quote.json?v={day}")
        if payload.get("date") == day:
            return validate_quote(payload.get("quote"))
    except (OSError, ValueError, AttributeError):
        pass
    return None


def validate_quote(value):
    if not isinstance(value, str):
        return None
    quote = value.strip().strip('“”"').strip()
    if not 10 <= len(quote) <= 100 or len(quote.splitlines()) != 1:
        return None
    return quote


def generate_quote(api_key, day):
    body = {
        "model": "deepseek-flash",
        "thinking": {"type": "disabled"},
        "max_tokens": 96,
        "messages": [
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": f"日期为 {day}。请写这一天的手账寄语。"},
        ],
    }
    request = urllib.request.Request(
        DEEPSEEK_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        result = read_json(request)
        return validate_quote(result["choices"][0]["message"]["content"])
    except urllib.error.HTTPError as exc:
        print(f"::warning::DeepSeek returned HTTP {exc.code}; using the local daily quote.")
    except (OSError, ValueError, KeyError, IndexError, TypeError):
        print("::warning::DeepSeek quote was unavailable; using the local daily quote.")
    return None


def main():
    day = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
    quote = existing_quote(os.environ.get("PAGES_URL"), day)
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if quote is None and api_key:
        quote = generate_quote(api_key, day)
    if quote is None:
        print("The website will show its local daily quote.")
        return
    QUOTE_FILE.write_text(
        json.dumps({"date": day, "quote": quote}, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
