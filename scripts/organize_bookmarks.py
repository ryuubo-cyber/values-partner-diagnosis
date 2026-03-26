#!/usr/bin/env python3
"""
ブックマーク・メモ整理ツール
Safari/Chrome のブックマークと Apple Notes のデータを構造化して整理します。
"""

import json
import os
import sqlite3
import plistlib
import argparse
from datetime import datetime, timezone
from pathlib import Path


# ブックマークの自動カテゴリ分類キーワード
URL_CATEGORIES = {
    "SNS": ["twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com", "threads.net", "mastodon"],
    "動画": ["youtube.com", "youtu.be", "vimeo.com", "nicovideo.jp", "twitch.tv", "netflix.com", "abema.tv"],
    "ニュース": ["news", "nikkei.com", "nhk.or.jp", "asahi.com", "mainichi.jp", "yomiuri.co.jp", "bbc.com", "cnn.com"],
    "ショッピング": ["amazon", "rakuten.co.jp", "mercari.com", "yahoo.co.jp/shopping", "zozotown.com"],
    "開発・技術": ["github.com", "stackoverflow.com", "qiita.com", "zenn.dev", "dev.to", "medium.com", "notion.so"],
    "学習": ["udemy.com", "coursera.org", "edx.org", "khan", "wikipedia.org", "docs."],
    "仕事": ["slack.com", "notion.so", "trello.com", "asana.com", "jira.", "confluence.", "google.com/docs", "google.com/sheets"],
    "メール": ["mail.google.com", "outlook.", "yahoo.co.jp/mail"],
    "音楽": ["spotify.com", "music.apple.com", "soundcloud.com"],
    "旅行": ["booking.com", "expedia", "airbnb", "tripadvisor", "jalan.net", "tabelog.com"],
    "金融": ["bank", "securities", "kabu", "moneyforward", "zaim"],
}


def categorize_url(url: str, title: str = "") -> str:
    """URLとタイトルからカテゴリを推定する"""
    url_lower = url.lower()
    title_lower = title.lower()

    for category, keywords in URL_CATEGORIES.items():
        for keyword in keywords:
            if keyword in url_lower or keyword in title_lower:
                return category

    return "その他"


def parse_chrome_bookmarks() -> list[dict]:
    """Chromeのブックマークを読み取る"""
    bookmarks = []
    chrome_paths = [
        Path("~/Library/Application Support/Google/Chrome/Default/Bookmarks"),
        Path("~/Library/Application Support/Google/Chrome/Profile 1/Bookmarks"),
    ]

    for chrome_path in chrome_paths:
        path = chrome_path.expanduser()
        if not path.exists():
            continue

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            def extract_bookmarks(node, folder_path=""):
                if node.get("type") == "url":
                    bookmarks.append({
                        "title": node.get("name", ""),
                        "url": node.get("url", ""),
                        "folder": folder_path,
                        "source": "Chrome",
                        "date_added": _chrome_timestamp(node.get("date_added", "0")),
                    })
                elif node.get("type") == "folder":
                    name = node.get("name", "")
                    new_path = f"{folder_path}/{name}" if folder_path else name
                    for child in node.get("children", []):
                        extract_bookmarks(child, new_path)

            roots = data.get("roots", {})
            for key in ["bookmark_bar", "other", "synced"]:
                if key in roots:
                    extract_bookmarks(roots[key])

        except (json.JSONDecodeError, KeyError, OSError):
            continue

    return bookmarks


def _chrome_timestamp(timestamp_str: str) -> str:
    """Chromeのタイムスタンプを日時文字列に変換"""
    try:
        # Chrome uses microseconds since 1601-01-01
        ts = int(timestamp_str)
        if ts > 0:
            epoch_diff = 11644473600
            unix_ts = (ts / 1_000_000) - epoch_diff
            dt = datetime.fromtimestamp(unix_ts, tz=timezone.utc)
            return dt.strftime("%Y-%m-%d %H:%M")
    except (ValueError, OSError):
        pass
    return "不明"


def parse_safari_bookmarks() -> list[dict]:
    """Safariのブックマークを読み取る"""
    bookmarks = []
    safari_path = Path("~/Library/Safari/Bookmarks.plist").expanduser()

    if not safari_path.exists():
        return bookmarks

    try:
        with open(safari_path, "rb") as f:
            data = plistlib.load(f)

        def extract_bookmarks(node, folder_path=""):
            if isinstance(node, dict):
                web_bookmark_type = node.get("WebBookmarkType", "")

                if web_bookmark_type == "WebBookmarkTypeLeaf":
                    url_dict = node.get("URIDictionary", {})
                    bookmarks.append({
                        "title": url_dict.get("title", node.get("Title", "")),
                        "url": node.get("URLString", ""),
                        "folder": folder_path,
                        "source": "Safari",
                        "date_added": "不明",
                    })
                elif web_bookmark_type == "WebBookmarkTypeList":
                    title = node.get("Title", "")
                    new_path = f"{folder_path}/{title}" if folder_path else title
                    for child in node.get("Children", []):
                        extract_bookmarks(child, new_path)

        extract_bookmarks(data)

    except (plistlib.InvalidFileException, OSError):
        pass

    return bookmarks


def export_organized_bookmarks(bookmarks: list[dict], output_dir: str):
    """整理されたブックマークをファイルに出力する"""
    output_path = Path(output_dir).expanduser()
    output_path.mkdir(parents=True, exist_ok=True)

    # カテゴリ別に分類
    categorized = {}
    for bm in bookmarks:
        category = categorize_url(bm["url"], bm["title"])
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(bm)

    # Markdown形式で出力
    md_path = output_path / "bookmarks_organized.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(f"# ブックマーク整理レポート\n\n")
        f.write(f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"合計: {len(bookmarks)} 件\n\n")

        for category in sorted(categorized.keys()):
            items = categorized[category]
            f.write(f"## {category} ({len(items)}件)\n\n")
            for bm in sorted(items, key=lambda x: x["title"]):
                title = bm["title"] or "無題"
                f.write(f"- [{title}]({bm['url']})")
                if bm["source"]:
                    f.write(f" *({bm['source']})*")
                f.write("\n")
            f.write("\n")

    # JSON形式でも出力
    json_path = output_path / "bookmarks_organized.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(categorized, f, ensure_ascii=False, indent=2)

    # 重複URL検出
    url_counts = {}
    for bm in bookmarks:
        url = bm["url"].rstrip("/")
        url_counts[url] = url_counts.get(url, 0) + 1

    duplicates = {url: count for url, count in url_counts.items() if count > 1}

    if duplicates:
        dup_path = output_path / "duplicate_bookmarks.md"
        with open(dup_path, "w", encoding="utf-8") as f:
            f.write("# 重複ブックマーク\n\n")
            for url, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True):
                f.write(f"- ({count}回) {url}\n")
        print(f"  重複ブックマーク: {len(duplicates)}件 -> {dup_path}")

    return md_path, json_path, categorized


def scan_apple_notes(output_dir: str) -> int:
    """Apple Notesのデータを読み取って整理する"""
    notes_db_path = Path("~/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite").expanduser()

    if not notes_db_path.exists():
        print("  Apple Notes データベースが見つかりません")
        return 0

    output_path = Path(output_dir).expanduser()
    output_path.mkdir(parents=True, exist_ok=True)
    notes_count = 0

    try:
        # SQLiteデータベースを読み取り専用で開く
        conn = sqlite3.connect(f"file:{notes_db_path}?mode=ro", uri=True)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                ZICCLOUDSYNCINGOBJECT.ZTITLE1 as title,
                ZICCLOUDSYNCINGOBJECT.ZSNIPPET as snippet,
                ZICCLOUDSYNCINGOBJECT.ZMODIFICATIONDATE1 as modified,
                ZICCLOUDSYNCINGOBJECT.ZCREATIONDATE3 as created
            FROM ZICCLOUDSYNCINGOBJECT
            WHERE ZICCLOUDSYNCINGOBJECT.ZTITLE1 IS NOT NULL
            AND ZICCLOUDSYNCINGOBJECT.ZMARKEDFORDELETION != 1
            ORDER BY ZICCLOUDSYNCINGOBJECT.ZMODIFICATIONDATE1 DESC
        """)

        notes = cursor.fetchall()
        conn.close()

        if notes:
            notes_path = output_path / "apple_notes_list.md"
            with open(notes_path, "w", encoding="utf-8") as f:
                f.write("# Apple Notes 一覧\n\n")
                f.write(f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write(f"合計: {len(notes)} 件\n\n")

                for title, snippet, modified, created in notes:
                    mod_date = ""
                    if modified:
                        # Apple's Core Data timestamp (seconds since 2001-01-01)
                        try:
                            dt = datetime(2001, 1, 1) + __import__("datetime").timedelta(seconds=modified)
                            mod_date = dt.strftime("%Y-%m-%d")
                        except (ValueError, OSError):
                            mod_date = "不明"

                    f.write(f"### {title or '無題'}\n")
                    if mod_date:
                        f.write(f"更新日: {mod_date}\n\n")
                    if snippet:
                        f.write(f"{snippet[:200]}...\n\n" if len(snippet) > 200 else f"{snippet}\n\n")
                    f.write("---\n\n")
                    notes_count += 1

            print(f"  Apple Notes一覧: {notes_count}件 -> {notes_path}")

    except (sqlite3.Error, OSError) as e:
        print(f"  Apple Notes読み取りエラー: {e}")

    return notes_count


def main():
    parser = argparse.ArgumentParser(
        description="ブックマーク・メモ整理ツール - Safari/Chromeのブックマークとメモを整理します"
    )
    parser.add_argument(
        "--output", "-o",
        default="~/Documents/整理済み/ブックマーク",
        help="出力先ディレクトリ (デフォルト: ~/Documents/整理済み/ブックマーク)"
    )
    parser.add_argument(
        "--chrome-only",
        action="store_true",
        help="Chromeのみ対象"
    )
    parser.add_argument(
        "--safari-only",
        action="store_true",
        help="Safariのみ対象"
    )
    parser.add_argument(
        "--skip-notes",
        action="store_true",
        help="Apple Notesのスキャンをスキップ"
    )

    args = parser.parse_args()

    print(f"\n{'=' * 60}")
    print(" ブックマーク・メモ整理ツール")
    print(f"{'=' * 60}\n")

    all_bookmarks = []

    # Chrome ブックマーク
    if not args.safari_only:
        print(" Chromeブックマークを読み取り中...")
        chrome_bm = parse_chrome_bookmarks()
        print(f"  → {len(chrome_bm)} 件")
        all_bookmarks.extend(chrome_bm)

    # Safari ブックマーク
    if not args.chrome_only:
        print(" Safariブックマークを読み取り中...")
        safari_bm = parse_safari_bookmarks()
        print(f"  → {len(safari_bm)} 件")
        all_bookmarks.extend(safari_bm)

    # ブックマーク整理・出力
    if all_bookmarks:
        print(f"\n 合計 {len(all_bookmarks)} 件のブックマークを整理中...")
        md_path, json_path, categorized = export_organized_bookmarks(all_bookmarks, args.output)

        print(f"\n{'─' * 60}")
        print(" カテゴリ別集計:")
        for cat, items in sorted(categorized.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"   {cat}: {len(items)} 件")
        print(f"{'─' * 60}")
        print(f" Markdownレポート: {md_path}")
        print(f" JSONデータ: {json_path}")
    else:
        print("\n ブックマークが見つかりませんでした。")

    # Apple Notes
    if not args.skip_notes:
        print(f"\n Apple Notesをスキャン中...")
        scan_apple_notes(args.output)

    print(f"\n 完了しました!")


if __name__ == "__main__":
    main()
