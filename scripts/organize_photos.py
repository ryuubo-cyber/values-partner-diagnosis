#!/usr/bin/env python3
"""
写真・動画メタデータ整理ツール
EXIF情報（撮影日時・GPS座標）を元に写真・動画を自動的にフォルダ分けします。
"""

import os
import shutil
import json
import struct
import argparse
from datetime import datetime
from pathlib import Path


# 写真・動画の拡張子
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tiff", ".tif", ".raw", ".cr2", ".nef", ".arw", ".dng"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".m4v", ".3gp", ".wmv", ".flv", ".webm"}
MEDIA_EXTENSIONS = PHOTO_EXTENSIONS | VIDEO_EXTENSIONS


def read_exif_date(file_path):
    """JPEG/TIFFファイルからEXIF撮影日時を読み取る（外部ライブラリ不要）"""
    try:
        with open(file_path, "rb") as f:
            data = f.read(65536)  # 先頭64KB

            # JPEG
            if data[:2] == b"\xff\xd8":
                return _parse_jpeg_exif_date(data)

            # TIFF
            if data[:2] in (b"II", b"MM"):
                return _parse_tiff_exif_date(data)

    except (OSError, struct.error, ValueError):
        pass

    return None


def _parse_jpeg_exif_date(data):
    """JPEGのEXIFから撮影日時を抽出"""
    offset = 2
    while offset < len(data) - 1:
        if data[offset] != 0xFF:
            break
        marker = data[offset + 1]
        if marker == 0xE1:  # APP1 (EXIF)
            size = struct.unpack(">H", data[offset + 2:offset + 4])[0]
            exif_data = data[offset + 4:offset + 2 + size]
            if exif_data[:4] == b"Exif":
                return _find_datetime_in_exif(exif_data[6:])
        elif marker == 0xDA:  # Start of scan
            break
        else:
            if offset + 3 < len(data):
                size = struct.unpack(">H", data[offset + 2:offset + 4])[0]
                offset += 2 + size
                continue
        offset += 2
    return None


def _parse_tiff_exif_date(data):
    """TIFFヘッダーから撮影日時を抽出"""
    return _find_datetime_in_exif(data)


def _find_datetime_in_exif(data):
    """EXIFデータ内からDateTimeOriginalを探す"""
    # DateTimeOriginal のパターンを直接検索（簡易実装）
    # フォーマット: "YYYY:MM:DD HH:MM:SS"
    text = data.decode("ascii", errors="ignore")
    import re
    pattern = r"(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})"
    match = re.search(pattern, text)
    if match:
        try:
            return datetime(
                int(match.group(1)), int(match.group(2)), int(match.group(3)),
                int(match.group(4)), int(match.group(5)), int(match.group(6))
            )
        except ValueError:
            pass
    return None


def get_file_date(file_path):
    """ファイルの日付を取得する（EXIF優先、なければ更新日時）"""
    # まずEXIFから取得を試みる
    if file_path.suffix.lower() in {".jpg", ".jpeg", ".tiff", ".tif"}:
        exif_date = read_exif_date(file_path)
        if exif_date and exif_date.year > 1990:
            return exif_date

    # ファイルの更新日時を使用
    mtime = os.path.getmtime(file_path)
    return datetime.fromtimestamp(mtime)


def get_media_type(file_path):
    """メディアタイプを判定する"""
    ext = file_path.suffix.lower()
    if ext in PHOTO_EXTENSIONS:
        return "写真"
    elif ext in VIDEO_EXTENSIONS:
        return "動画"
    return "その他"


def organize_media(source_dirs, dest_dir, folder_format="year-month",
                   dry_run=True, copy_mode=False):
    """
    写真・動画をメタデータに基づいて整理する

    Args:
        source_dirs: 検索元ディレクトリのリスト
        dest_dir: 整理先ディレクトリ
        folder_format: フォルダ構造のフォーマット
        dry_run: プレビューモード
        copy_mode: True=コピー, False=移動
    """
    dest = Path(dest_dir).expanduser()

    print(f"\n{'=' * 60}")
    print(f" 写真・動画整理ツール {'(プレビュー)' if dry_run else '(実行中)'}")
    print(f"{'=' * 60}")
    print(f" 整理先: {dest}")
    print(f" モード: {'コピー' if copy_mode else '移動'}")
    print(f"{'=' * 60}\n")

    # メディアファイルを収集
    media_files = []
    for search_dir in source_dirs:
        search_path = Path(search_dir).expanduser()
        if not search_path.exists():
            print(f"  スキップ: {search_path} (存在しません)")
            continue

        for file_path in search_path.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in MEDIA_EXTENSIONS and not file_path.name.startswith("."):
                media_files.append(file_path)

    if not media_files:
        print(" 対象のメディアファイルが見つかりませんでした。")
        return

    print(f" 対象ファイル数: {len(media_files)}\n")

    stats = {"写真": 0, "動画": 0}
    year_stats = {}

    for file_path in sorted(media_files):
        file_date = get_file_date(file_path)
        media_type = get_media_type(file_path)
        stats[media_type] = stats.get(media_type, 0) + 1

        year = str(file_date.year)
        year_stats[year] = year_stats.get(year, 0) + 1

        # フォルダ構造を決定
        if folder_format == "year":
            sub_folder = file_date.strftime("%Y")
        elif folder_format == "year-month":
            sub_folder = file_date.strftime("%Y/%Y-%m")
        elif folder_format == "year-month-day":
            sub_folder = file_date.strftime("%Y/%Y-%m/%Y-%m-%d")
        else:
            sub_folder = file_date.strftime("%Y/%Y-%m")

        target_dir = dest / media_type / sub_folder
        target_path = target_dir / file_path.name

        # 同名ファイル対策
        if target_path.exists() and target_path != file_path:
            stem = file_path.stem
            suffix = file_path.suffix
            counter = 1
            while target_path.exists():
                target_path = target_dir / f"{stem}_{counter}{suffix}"
                counter += 1

        if dry_run:
            print(f"  [{media_type}] {file_path.name} ({file_date.strftime('%Y-%m-%d')}) -> {target_path.parent}/")
        else:
            target_dir.mkdir(parents=True, exist_ok=True)
            if copy_mode:
                shutil.copy2(str(file_path), str(target_path))
                print(f"  コピー完了: {file_path.name} -> {target_path}")
            else:
                shutil.move(str(file_path), str(target_path))
                print(f"  移動完了: {file_path.name} -> {target_path}")

    print(f"\n{'─' * 60}")
    print(" メディアタイプ別:")
    for media_type, count in sorted(stats.items()):
        if count > 0:
            print(f"   {media_type}: {count} ファイル")
    print(f"\n 年別:")
    for year, count in sorted(year_stats.items()):
        print(f"   {year}年: {count} ファイル")
    print(f"{'─' * 60}")

    if dry_run:
        print(f"\n これはプレビューです。実行するには --execute オプションを付けてください。")
        print(f" 元ファイルを残したい場合は --copy も付けてください。")


def main():
    parser = argparse.ArgumentParser(
        description="写真・動画整理ツール - 撮影日時に基づいてメディアファイルを整理します"
    )
    parser.add_argument(
        "directories",
        nargs="*",
        default=["~/Pictures", "~/Desktop", "~/Downloads"],
        help="検索するディレクトリ (デフォルト: ~/Pictures ~/Desktop ~/Downloads)"
    )
    parser.add_argument(
        "--dest", "-d",
        default="~/Pictures/整理済み",
        help="整理先ディレクトリ (デフォルト: ~/Pictures/整理済み)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["year", "year-month", "year-month-day"],
        default="year-month",
        help="フォルダ構造 (デフォルト: year-month → 2024/2024-03/)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="実際にファイルを移動する (省略時はプレビューのみ)"
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        help="移動ではなくコピーする (元ファイルを残す)"
    )

    args = parser.parse_args()

    organize_media(
        source_dirs=args.directories,
        dest_dir=args.dest,
        folder_format=args.format,
        dry_run=not args.execute,
        copy_mode=args.copy,
    )


if __name__ == "__main__":
    main()
