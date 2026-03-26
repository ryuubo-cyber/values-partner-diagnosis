#!/usr/bin/env python3
"""
重複ファイル検出ツール
ハッシュ値を使って重複ファイルを見つけ、整理を支援します。
"""

import os
import hashlib
import argparse
from pathlib import Path
from collections import defaultdict


def calculate_hash(file_path, quick=False):
    """
    ファイルのハッシュ値を計算する

    Args:
        file_path: ファイルパス
        quick: True の場合、先頭・末尾のみハッシュ（高速モード）
    """
    hasher = hashlib.md5()

    try:
        with open(file_path, "rb") as f:
            if quick:
                # クイックモード: 先頭8KB + 末尾8KB
                hasher.update(f.read(8192))
                f.seek(0, 2)  # ファイル末尾
                size = f.tell()
                if size > 8192:
                    f.seek(-8192, 2)
                    hasher.update(f.read(8192))
            else:
                # フルモード: ファイル全体
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
    except (PermissionError, OSError):
        return ""

    return hasher.hexdigest()


def format_size(size_bytes):
    """バイト数を読みやすい形式に変換する"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"


def find_duplicates(search_dirs, min_size=0, extensions=None):
    """
    重複ファイルを検出する

    Args:
        search_dirs: 検索対象ディレクトリのリスト
        min_size: 最小ファイルサイズ（バイト）
        extensions: 対象とする拡張子のリスト
    """
    print(f"\n{'=' * 60}")
    print(" 重複ファイル検出ツール")
    print(f"{'=' * 60}\n")

    # Step 1: ファイル一覧を取得し、サイズでグループ化
    print(" Step 1/3: ファイルをスキャン中...")
    size_groups = defaultdict(list)
    total_files = 0
    skipped = 0

    for search_dir in search_dirs:
        search_path = Path(search_dir).expanduser()
        if not search_path.exists():
            print(f"  スキップ: {search_path} (存在しません)")
            continue

        for file_path in search_path.rglob("*"):
            if not file_path.is_file() or file_path.name.startswith("."):
                continue

            if extensions:
                if file_path.suffix.lower() not in extensions:
                    skipped += 1
                    continue

            try:
                size = file_path.stat().st_size
            except (PermissionError, OSError):
                skipped += 1
                continue

            if size < min_size:
                skipped += 1
                continue

            size_groups[size].append(file_path)
            total_files += 1

    print(f"  スキャン完了: {total_files} ファイル (スキップ: {skipped})")

    # サイズが一致するファイルのみ残す
    candidates = {size: paths for size, paths in size_groups.items() if len(paths) > 1}
    candidate_count = sum(len(paths) for paths in candidates.values())
    print(f"  サイズ重複候補: {candidate_count} ファイル")

    if not candidates:
        print("\n 重複ファイルは見つかりませんでした。")
        return

    # Step 2: クイックハッシュでフィルタリング
    print("\n Step 2/3: クイックハッシュで絞り込み中...")
    quick_hash_groups = defaultdict(list)

    for size, paths in candidates.items():
        for path in paths:
            h = calculate_hash(path, quick=True)
            if h:
                quick_hash_groups[(size, h)].append(path)

    quick_candidates = {k: v for k, v in quick_hash_groups.items() if len(v) > 1}
    quick_count = sum(len(paths) for paths in quick_candidates.values())
    print(f"  クイックハッシュ重複候補: {quick_count} ファイル")

    # Step 3: フルハッシュで確定
    print("\n Step 3/3: フルハッシュで確定中...")
    full_hash_groups = defaultdict(list)

    for key, paths in quick_candidates.items():
        for path in paths:
            h = calculate_hash(path, quick=False)
            if h:
                full_hash_groups[h].append(path)

    duplicates = {h: paths for h, paths in full_hash_groups.items() if len(paths) > 1}

    # 結果表示
    if not duplicates:
        print("\n 重複ファイルは見つかりませんでした。")
        return

    total_waste = 0
    dup_group_count = 0

    print(f"\n{'=' * 60}")
    print(" 重複ファイル一覧")
    print(f"{'=' * 60}")

    for hash_val, paths in sorted(duplicates.items()):
        dup_group_count += 1
        file_size = paths[0].stat().st_size
        waste = file_size * (len(paths) - 1)
        total_waste += waste

        print(f"\n グループ {dup_group_count} ({format_size(file_size)} x {len(paths)}ファイル, 無駄: {format_size(waste)}):")
        for i, path in enumerate(sorted(paths)):
            marker = " [オリジナル候補]" if i == 0 else ""
            print(f"   {i + 1}. {path}{marker}")

    print(f"\n{'─' * 60}")
    print(f" 重複グループ数: {dup_group_count}")
    print(f" 重複ファイル数: {sum(len(p) for p in duplicates.values())}")
    print(f" 削除可能な容量: {format_size(total_waste)}")
    print(f"{'─' * 60}")

    # 削除候補をファイルに出力
    report_path = Path("~/Documents/duplicate_report.txt").expanduser()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("重複ファイルレポート\n")
        f.write(f"生成日時: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"{'=' * 60}\n\n")

        for hash_val, paths in sorted(duplicates.items()):
            file_size = paths[0].stat().st_size
            f.write(f"グループ ({format_size(file_size)}):\n")
            for i, path in enumerate(sorted(paths)):
                marker = " [保持推奨]" if i == 0 else " [削除候補]"
                f.write(f"  {path}{marker}\n")
            f.write("\n")

    print(f"\n レポートを保存しました: {report_path}")
    print(" ※ファイルの削除は手動で行ってください。レポートを確認してから削除することをお勧めします。")


def main():
    parser = argparse.ArgumentParser(
        description="重複ファイル検出ツール - ハッシュ値で重複ファイルを見つけます"
    )
    parser.add_argument(
        "directories",
        nargs="*",
        default=["~/Downloads", "~/Desktop", "~/Documents"],
        help="検索するディレクトリ (デフォルト: ~/Downloads ~/Desktop ~/Documents)"
    )
    parser.add_argument(
        "--min-size", "-m",
        type=int,
        default=1024,
        help="最小ファイルサイズ (バイト, デフォルト: 1024)"
    )
    parser.add_argument(
        "--images-only",
        action="store_true",
        help="画像ファイルのみ検索"
    )
    parser.add_argument(
        "--videos-only",
        action="store_true",
        help="動画ファイルのみ検索"
    )

    args = parser.parse_args()

    extensions = None
    if args.images_only:
        extensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".heic", ".heif", ".webp"]
    elif args.videos_only:
        extensions = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v"]

    find_duplicates(args.directories, args.min_size, extensions)


if __name__ == "__main__":
    main()
