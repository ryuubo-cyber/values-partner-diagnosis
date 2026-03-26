#!/usr/bin/env python3
"""
Mac ファイル自動整理スクリプト
デスクトップ・ダウンロードフォルダのファイルを種類別・日付別に自動分類します。
"""

import os
import shutil
import argparse
from datetime import datetime
from pathlib import Path

# ファイル種類ごとの分類マッピング
FILE_CATEGORIES = {
    "画像": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg", ".ico", ".heic", ".heif", ".raw", ".cr2", ".nef"},
    "動画": {".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".mpg", ".mpeg", ".3gp"},
    "音楽": {".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a", ".aiff", ".alac"},
    "ドキュメント": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".pages", ".tex", ".md", ".epub"},
    "スプレッドシート": {".xls", ".xlsx", ".csv", ".numbers", ".ods", ".tsv"},
    "プレゼンテーション": {".ppt", ".pptx", ".key", ".odp"},
    "アーカイブ": {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".dmg", ".iso", ".pkg"},
    "コード": {".py", ".js", ".ts", ".html", ".css", ".java", ".cpp", ".c", ".h", ".rb", ".go", ".rs", ".swift", ".sh", ".json", ".xml", ".yaml", ".yml"},
    "フォント": {".ttf", ".otf", ".woff", ".woff2", ".eot"},
    "データベース": {".sql", ".db", ".sqlite", ".sqlite3"},
    "アプリケーション": {".app", ".exe", ".msi", ".deb", ".rpm"},
}


def get_category(file_path: Path) -> str:
    """ファイルの拡張子からカテゴリを判定する"""
    ext = file_path.suffix.lower()
    for category, extensions in FILE_CATEGORIES.items():
        if ext in extensions:
            return category
    return "その他"


def get_date_folder(file_path: Path) -> str:
    """ファイルの更新日時から日付フォルダ名を生成する"""
    mtime = os.path.getmtime(file_path)
    dt = datetime.fromtimestamp(mtime)
    return dt.strftime("%Y/%Y-%m")


def organize_files(source_dir: str, dest_dir: str, by_date: bool = False, dry_run: bool = True):
    """
    ファイルを整理する

    Args:
        source_dir: 整理元のディレクトリ
        dest_dir: 整理先のディレクトリ
        by_date: 日付別にもサブフォルダを作成するか
        dry_run: True の場合は実際には移動せず、プレビューのみ表示
    """
    source = Path(source_dir).expanduser()
    dest = Path(dest_dir).expanduser()

    if not source.exists():
        print(f"エラー: ソースディレクトリが見つかりません: {source}")
        return

    files = [f for f in source.iterdir() if f.is_file() and not f.name.startswith(".")]

    if not files:
        print(f"整理するファイルがありません: {source}")
        return

    print(f"\n{'=' * 60}")
    print(f" ファイル自動整理 {'(プレビュー)' if dry_run else '(実行中)'}")
    print(f"{'=' * 60}")
    print(f" 整理元: {source}")
    print(f" 整理先: {dest}")
    print(f" 対象ファイル数: {len(files)}")
    print(f"{'=' * 60}\n")

    moved_count = 0
    category_counts = {}

    for file_path in sorted(files):
        category = get_category(file_path)
        category_counts[category] = category_counts.get(category, 0) + 1

        if by_date:
            date_folder = get_date_folder(file_path)
            target_dir = dest / category / date_folder
        else:
            target_dir = dest / category

        target_path = target_dir / file_path.name

        # 同名ファイルが存在する場合はリネーム
        if target_path.exists():
            stem = file_path.stem
            suffix = file_path.suffix
            counter = 1
            while target_path.exists():
                target_path = target_dir / f"{stem}_{counter}{suffix}"
                counter += 1

        if dry_run:
            print(f"  [{category}] {file_path.name} -> {target_path}")
        else:
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(file_path), str(target_path))
            print(f"  移動完了: {file_path.name} -> {target_path}")

        moved_count += 1

    print(f"\n{'─' * 60}")
    print(" カテゴリ別集計:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {cat}: {count} ファイル")
    print(f"{'─' * 60}")
    print(f" 合計: {moved_count} ファイル")

    if dry_run:
        print(f"\n これはプレビューです。実際に移動するには --execute オプションを付けてください。")


def main():
    parser = argparse.ArgumentParser(
        description="Mac ファイル自動整理ツール - デスクトップやダウンロードのファイルを種類別に整理します"
    )
    parser.add_argument(
        "--source", "-s",
        default="~/Downloads",
        help="整理元ディレクトリ (デフォルト: ~/Downloads)"
    )
    parser.add_argument(
        "--dest", "-d",
        default="~/Documents/整理済み",
        help="整理先ディレクトリ (デフォルト: ~/Documents/整理済み)"
    )
    parser.add_argument(
        "--by-date",
        action="store_true",
        help="日付別にサブフォルダも作成する (例: 画像/2024/2024-03/)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="実際にファイルを移動する (省略時はプレビューのみ)"
    )
    parser.add_argument(
        "--desktop",
        action="store_true",
        help="デスクトップも整理対象に含める"
    )

    args = parser.parse_args()
    dry_run = not args.execute

    # ダウンロードフォルダの整理
    organize_files(args.source, args.dest, args.by_date, dry_run)

    # デスクトップも指定された場合
    if args.desktop:
        organize_files("~/Desktop", args.dest, args.by_date, dry_run)


if __name__ == "__main__":
    main()
