#!/usr/bin/env python3
"""
Analyze a ChatGPT data export folder.

Outputs:
- chatgpt_export_summary.md
- conversations_summary.csv
- monthly_stats.csv
- top_longest_conversations.csv
- top_words.csv

pip install tiktoken pandas

Usage:
    python chatgpt_export_stats.py /path/to/unzipped/export
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    import tiktoken
except ImportError:
    tiktoken = None


STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "you", "are", "was", "but", "not",
    "have", "from", "your", "can", "will", "would", "should", "about", "what",
    "when", "where", "how", "why", "into", "just", "like", "also", "then",
    "than", "they", "them", "there", "here", "does", "did", "doing", "done",
    "get", "got", "use", "using", "used", "make", "need", "want", "think",
    "chatgpt", "assistant", "user"
}


@dataclass
class ConversationStats:
    title: str
    create_time: str
    update_time: str
    total_messages: int
    user_messages: int
    assistant_messages: int
    system_messages: int
    other_messages: int
    user_chars: int
    assistant_chars: int
    total_chars: int
    estimated_user_tokens: int
    estimated_assistant_tokens: int
    estimated_total_tokens: int


def ts_to_iso(value: Any) -> str:
    if not value:
        return ""
    try:
        return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat()
    except Exception:
        return ""


def load_json(path: Path) -> Any | None:
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def find_conversation_json_files(root: Path) -> list[Path]:
    """Find all ChatGPT conversation JSON files in an export folder.

    Newer/larger exports may be split across files such as:
    - conversations.json
    - conversations-001.json
    - conversations-002.json
    """
    candidates = sorted(root.rglob("conversations*.json"))
    conversation_files: list[Path] = []

    for path in candidates:
        data = load_json(path)
        if isinstance(data, list) and (not data or isinstance(data[0], dict)):
            conversation_files.append(path)

    if conversation_files:
        return conversation_files

    # Fallback: find JSON files that look like a list of conversations.
    for path in sorted(root.rglob("*.json")):
        data = load_json(path)
        if isinstance(data, list) and data and isinstance(data[0], dict):
            if "mapping" in data[0] or "title" in data[0]:
                conversation_files.append(path)

    return conversation_files


def get_text_from_content(content: Any) -> str:
    if not isinstance(content, dict):
        return ""

    parts = content.get("parts")
    if isinstance(parts, list):
        extracted = []
        for part in parts:
            if isinstance(part, str):
                extracted.append(part)
            elif isinstance(part, dict):
                # Some exports store structured content
                extracted.append(json.dumps(part, ensure_ascii=False))
        return "\n".join(extracted)

    text = content.get("text")
    if isinstance(text, str):
        return text

    return ""


def iter_messages(conversation: dict[str, Any]) -> Iterable[tuple[str, str]]:
    mapping = conversation.get("mapping")

    if isinstance(mapping, dict):
        for node in mapping.values():
            msg = node.get("message") if isinstance(node, dict) else None
            if not isinstance(msg, dict):
                continue

            author = msg.get("author", {})
            role = author.get("role", "unknown") if isinstance(author, dict) else "unknown"
            text = get_text_from_content(msg.get("content", {}))

            if text.strip():
                yield role, text

    # fallback format
    messages = conversation.get("messages")
    if isinstance(messages, list):
        for msg in messages:
            if not isinstance(msg, dict):
                continue
            role = msg.get("role") or msg.get("author", {}).get("role", "unknown")
            text = get_text_from_content(msg.get("content", {}))
            if text.strip():
                yield role, text


def make_encoder(model: str = "gpt-4o"):
    if tiktoken is None:
        return None
    try:
        return tiktoken.encoding_for_model(model)
    except Exception:
        return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str, encoder) -> int:
    if not text:
        return 0
    if encoder is None:
        # rough fallback: 1 token ~= 4 chars in English-ish text
        return max(1, len(text) // 4)
    return len(encoder.encode(text))


def safe_title(title: Any) -> str:
    if isinstance(title, str) and title.strip():
        return title.strip()
    return "Untitled"


def analyze_conversation(conv: dict[str, Any], encoder) -> tuple[ConversationStats, Counter]:
    title = safe_title(conv.get("title"))
    create_time = ts_to_iso(conv.get("create_time"))
    update_time = ts_to_iso(conv.get("update_time"))

    counts = Counter()
    chars = Counter()
    tokens = Counter()
    word_counter = Counter()

    for role, text in iter_messages(conv):
        role_key = role if role in {"user", "assistant", "system"} else "other"
        counts[role_key] += 1
        chars[role_key] += len(text)
        tokens[role_key] += count_tokens(text, encoder)

        if role_key == "user":
            words = re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", text.lower())
            word_counter.update(w for w in words if w not in STOPWORDS)

    stats = ConversationStats(
        title=title,
        create_time=create_time,
        update_time=update_time,
        total_messages=sum(counts.values()),
        user_messages=counts["user"],
        assistant_messages=counts["assistant"],
        system_messages=counts["system"],
        other_messages=counts["other"],
        user_chars=chars["user"],
        assistant_chars=chars["assistant"],
        total_chars=sum(chars.values()),
        estimated_user_tokens=tokens["user"],
        estimated_assistant_tokens=tokens["assistant"],
        estimated_total_tokens=sum(tokens.values()),
    )
    return stats, word_counter


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def month_key(iso_date: str) -> str:
    if not iso_date:
        return "unknown"
    return iso_date[:7]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("export_folder", help="Path to unzipped ChatGPT export folder")
    parser.add_argument("--model", default="gpt-4o", help="Tokenizer model estimate, default: gpt-4o")
    args = parser.parse_args()

    root = Path(args.export_folder).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Folder does not exist: {root}")

    conversation_files = find_conversation_json_files(root)
    if not conversation_files:
        raise SystemExit("Could not find conversations.json, conversations-*.json, or conversation-like JSON files.")

    print("Using conversation files:")
    for path in conversation_files:
        print(f"  - {path}")

    data: list[dict[str, Any]] = []
    for path in conversation_files:
        loaded = load_json(path)
        if isinstance(loaded, list):
            data.extend(item for item in loaded if isinstance(item, dict))
        else:
            print(f"Skipping non-list JSON file: {path}")

    if not data:
        raise SystemExit("No conversations found in conversation JSON files.")

    encoder = make_encoder(args.model)

    all_stats: list[ConversationStats] = []
    all_words = Counter()

    for conv in data:
        if not isinstance(conv, dict):
            continue
        stats, words = analyze_conversation(conv, encoder)
        if stats.total_messages > 0:
            all_stats.append(stats)
            all_words.update(words)

    out_dir = root / "chatgpt_export_analysis"
    out_dir.mkdir(exist_ok=True)

    rows = [asdict(s) for s in all_stats]
    write_csv(out_dir / "conversations_summary.csv", rows)

    longest = sorted(rows, key=lambda r: r["estimated_total_tokens"], reverse=True)[:50]
    write_csv(out_dir / "top_longest_conversations.csv", longest)

    monthly = defaultdict(lambda: Counter())
    for s in all_stats:
        m = month_key(s.create_time)
        monthly[m]["conversations"] += 1
        monthly[m]["messages"] += s.total_messages
        monthly[m]["user_messages"] += s.user_messages
        monthly[m]["assistant_messages"] += s.assistant_messages
        monthly[m]["estimated_tokens"] += s.estimated_total_tokens
        monthly[m]["user_tokens"] += s.estimated_user_tokens
        monthly[m]["assistant_tokens"] += s.estimated_assistant_tokens
        monthly[m]["chars"] += s.total_chars

    monthly_rows = [
        {"month": month, **dict(counter)}
        for month, counter in sorted(monthly.items())
    ]
    write_csv(out_dir / "monthly_stats.csv", monthly_rows)

    top_words_rows = [
        {"word": word, "count": count}
        for word, count in all_words.most_common(300)
    ]
    write_csv(out_dir / "top_words.csv", top_words_rows)

    total_conversations = len(all_stats)
    total_messages = sum(s.total_messages for s in all_stats)
    user_messages = sum(s.user_messages for s in all_stats)
    assistant_messages = sum(s.assistant_messages for s in all_stats)
    total_chars = sum(s.total_chars for s in all_stats)
    user_tokens = sum(s.estimated_user_tokens for s in all_stats)
    assistant_tokens = sum(s.estimated_assistant_tokens for s in all_stats)
    total_tokens = sum(s.estimated_total_tokens for s in all_stats)

    avg_messages = total_messages / total_conversations if total_conversations else 0
    avg_tokens = total_tokens / total_conversations if total_conversations else 0

    summary = f"""# ChatGPT Export Stats

Source files:

`{len(conversation_files)} conversation JSON file(s)`

## Totals

| Metric | Value |
|---|---:|
| Conversations | {total_conversations:,} |
| Total messages | {total_messages:,} |
| User messages | {user_messages:,} |
| Assistant messages | {assistant_messages:,} |
| Total characters | {total_chars:,} |
| Estimated user tokens | {user_tokens:,} |
| Estimated assistant tokens | {assistant_tokens:,} |
| Estimated total tokens | {total_tokens:,} |
| Avg messages / conversation | {avg_messages:,.1f} |
| Avg tokens / conversation | {avg_tokens:,.0f} |

## Top 20 Longest Conversations by Estimated Tokens

| Rank | Title | Created | Messages | Est. Tokens |
|---:|---|---|---:|---:|
"""

    for i, row in enumerate(longest[:20], start=1):
        title = str(row["title"]).replace("|", "\\|")[:90]
        summary += (
            f"| {i} | {title} | {row['create_time'][:10]} | "
            f"{row['total_messages']:,} | {row['estimated_total_tokens']:,} |\n"
        )

    summary += """

## Notes

Token count is an estimate. ChatGPT’s internal token accounting may differ because:
- Different models use different tokenizers.
- System messages and hidden metadata are not fully visible in the export.
- Uploaded files, images, tool calls, and generated artifacts may not be represented as normal text.
- Some structured message parts may be serialized differently.

Still, this should give a very good directional estimate.
"""

    (out_dir / "chatgpt_export_summary.md").write_text(summary, encoding="utf-8")

    print()
    print("Done.")
    print(f"Output folder: {out_dir}")
    print(f"Conversation JSON files processed: {len(conversation_files):,}")
    print(f"Estimated total tokens: {total_tokens:,}")
    print(f"Total conversations: {total_conversations:,}")
    print(f"Total messages: {total_messages:,}")


if __name__ == "__main__":
    main()
    