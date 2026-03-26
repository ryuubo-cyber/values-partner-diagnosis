#!/usr/bin/env python3
"""
ストレージ分析ツール
ディスク使用量を可視化し、不要ファイルの特定を支援します。
"""

import os
import argparse
from pathlib import Path
from datetime import datetime, timedelta


def format_size(size_bytes):
    """バイト数を読みやすい形式に変換する"""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(size_bytes) < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"


def get_dir_size(path, max_depth=0, current_depth=0):
    """ディレクトリのサイズを再帰的に計算する"""
    result = {"path": path, "size": 0, "files": 0, "children": []}

    try:
        entries = list(path.iterdir())
    except PermissionError:
        return result

    for entry in entries:
        if entry.name.startswith(".") and current_depth == 0:
            # トップレベルの隠しフォルダはスキップ可能にする（後で対応）
            pass

        try:
            if entry.is_file(follow_symlinks=False):
                result["size"] += entry.stat().st_size
                result["files"] += 1
            elif entry.is_dir(follow_symlinks=False):
                if current_depth < max_depth:
                    child = get_dir_size(entry, max_depth, current_depth + 1)
                    result["size"] += child["size"]
                    result["files"] += child["files"]
                    result["children"].append(child)
                else:
                    # 深さ制限に達した場合は直接合計
                    child_size, child_files = _quick_dir_size(entry)
                    result["size"] += child_size
                    result["files"] += child_files
                    result["children"].append({
                        "path": entry,
                        "size": child_size,
                        "files": child_files,
                        "children": [],
                    })
        except (PermissionError, OSError):
            continue

    return result


def _quick_dir_size(path):
    """ディレクトリのサイズを高速計算する（子の詳細なし）"""
    total_size = 0
    total_files = 0
    try:
        for entry in path.rglob("*"):
            try:
                if entry.is_file(follow_symlinks=False):
                    total_size += entry.stat().st_size
                    total_files += 1
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError):
        pass
    return total_size, total_files


def print_tree(result, indent=0, min_size=10 * 1024 * 1024):
    """ディレクトリツリーを表示する"""
    if result["size"] < min_size:
        return

    bar_width = 30
    prefix = "  " * indent

    name = result["path"].name or str(result["path"])
    size_str = format_size(result["size"])
    files_str = f"({result['files']} files)"

    print(f"{prefix} {size_str:>10}  {name}/ {files_str}")

    # 子ディレクトリをサイズ降順で表示
    children = sorted(result["children"], key=lambda x: x["size"], reverse=True)
    for child in children:
        print_tree(child, indent + 1, min_size)


def find_large_files(search_dir, top_n=30, min_size=50 * 1024 * 1024):
    """大きなファイルを見つける"""
    path = Path(search_dir).expanduser()
    large_files = []

    try:
        for entry in path.rglob("*"):
            try:
                if entry.is_file(follow_symlinks=False):
                    size = entry.stat().st_size
                    if size >= min_size:
                        large_files.append((entry, size))
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError):
        pass

    large_files.sort(key=lambda x: x[1], reverse=True)
    return large_files[:top_n]


def find_old_files(search_dir, days=365, top_n=30):
    """長期間アクセスされていないファイルを見つける"""
    path = Path(search_dir).expanduser()
    cutoff = datetime.now() - timedelta(days=days)
    old_files = []

    try:
        for entry in path.rglob("*"):
            try:
                if entry.is_file(follow_symlinks=False) and not entry.name.startswith("."):
                    stat = entry.stat()
                    atime = datetime.fromtimestamp(stat.st_atime)
                    if atime < cutoff:
                        old_files.append((entry, stat.st_size, atime))
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError):
        pass

    old_files.sort(key=lambda x: x[1], reverse=True)
    return old_files[:top_n]


def find_cache_dirs(home_dir):
    """キャッシュディレクトリを見つけてサイズを計算する"""
    home = Path(home_dir).expanduser()

    # よくあるキャッシュディレクトリ
    cache_candidates = [
        home / "Library" / "Caches",
        home / "Library" / "Logs",
        home / ".Trash",
        home / "Library" / "Application Support" / "Code" / "Cache",
        home / "Library" / "Application Support" / "Google" / "Chrome" / "Default" / "Cache",
        home / "Library" / "Application Support" / "Slack" / "Cache",
        home / "Library" / "Developer" / "Xcode" / "DerivedData",
        home / "Library" / "Developer" / "CoreSimulator",
        home / ".npm",
        home / ".cache",
        home / "node_modules",
    ]

    results = []
    for cache_dir in cache_candidates:
        if cache_dir.exists():
            size, files = _quick_dir_size(cache_dir)
            if size > 1024 * 1024:  # 1MB以上のみ
                results.append((cache_dir, size))

    results.sort(key=lambda x: x[1], reverse=True)
    return results


def analyze_storage(target_dir, depth=2, show_large=True,
                    show_old=True, show_cache=True):
    """ストレージを総合分析する"""
    target = Path(target_dir).expanduser()

    print(f"\n{'=' * 60}")
    print(" Mac ストレージ分析ツール")
    print(f"{'=' * 60}")
    print(f" 分析対象: {target}")
    print(f"{'=' * 60}\n")

    # 1. ディレクトリサイズ分析
    print(" [1/4] ディレクトリサイズを分析中...\n")
    tree = get_dir_size(target, max_depth=depth)
    print(f" 合計: {format_size(tree['size'])} ({tree['files']} ファイル)\n")
    print(" ディレクトリ別使用量 (10MB以上):")
    print(f"{'─' * 50}")

    children = sorted(tree["children"], key=lambda x: x["size"], reverse=True)
    total = tree["size"] if tree["size"] > 0 else 1

    for child in children:
        if child["size"] < 10 * 1024 * 1024:
            continue
        name = child["path"].name
        size_str = format_size(child["size"])
        pct = (child["size"] / total) * 100
        bar_len = int(pct / 3)
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"  {name:<25} {size_str:>10} ({pct:5.1f}%) |{bar}|")

    # 2. 大きなファイル
    if show_large:
        print(f"\n\n [2/4] 大きなファイルを検索中...\n")
        large_files = find_large_files(target_dir, top_n=20, min_size=50 * 1024 * 1024)

        if large_files:
            print(f" 50MB以上の大きなファイル TOP {len(large_files)}:")
            print(f"{'─' * 50}")
            total_large = 0
            for file_path, size in large_files:
                total_large += size
                rel_path = file_path.relative_to(target) if file_path.is_relative_to(target) else file_path
                print(f"  {format_size(size):>10}  {rel_path}")
            print(f"{'─' * 50}")
            print(f"  合計: {format_size(total_large)}")
        else:
            print("  50MB以上のファイルはありません。")

    # 3. 古いファイル
    if show_old:
        print(f"\n\n [3/4] 長期未使用ファイルを検索中...\n")
        old_files = find_old_files(target_dir, days=365, top_n=20)

        if old_files:
            print(f" 1年以上アクセスされていないファイル TOP {len(old_files)}:")
            print(f"{'─' * 50}")
            total_old = 0
            for file_path, size, atime in old_files:
                total_old += size
                rel_path = file_path.relative_to(target) if file_path.is_relative_to(target) else file_path
                print(f"  {format_size(size):>10}  {atime.strftime('%Y-%m-%d')}  {rel_path}")
            print(f"{'─' * 50}")
            print(f"  合計: {format_size(total_old)}  (削除候補)")
        else:
            print("  1年以上アクセスされていないファイルはありません。")

    # 4. キャッシュ分析
    if show_cache:
        print(f"\n\n [4/4] キャッシュ・一時ファイルを分析中...\n")
        cache_dirs = find_cache_dirs(target_dir)

        if cache_dirs:
            print(f" クリーンアップ可能なディレクトリ:")
            print(f"{'─' * 50}")
            total_cache = 0
            for cache_path, size in cache_dirs:
                total_cache += size
                rel_path = cache_path.relative_to(target) if cache_path.is_relative_to(target) else cache_path
                print(f"  {format_size(size):>10}  {rel_path}")
            print(f"{'─' * 50}")
            print(f"  合計: {format_size(total_cache)}  (クリーンアップ可能)")
        else:
            print("  大きなキャッシュディレクトリは見つかりませんでした。")

    # サマリー出力
    report_path = Path("~/Documents/storage_report.txt").expanduser()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"Mac ストレージ分析レポート\n")
        f.write(f"生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"分析対象: {target}\n")
        f.write(f"合計サイズ: {format_size(tree['size'])}\n")
        f.write(f"ファイル数: {tree['files']}\n")

    print(f"\n\n{'=' * 60}")
    print(f" レポートを保存しました: {report_path}")
    print(f"{'=' * 60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Mac ストレージ分析ツール - ディスク使用量を可視化して不要ファイルを特定します"
    )
    parser.add_argument(
        "--target", "-t",
        default="~",
        help="分析するディレクトリ (デフォルト: ホームディレクトリ)"
    )
    parser.add_argument(
        "--depth", "-d",
        type=int,
        default=2,
        help="分析する階層の深さ (デフォルト: 2)"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="高速モード (大きなファイル・古いファイルの検索をスキップ)"
    )

    args = parser.parse_args()

    analyze_storage(
        target_dir=args.target,
        depth=args.depth,
        show_large=not args.quick,
        show_old=not args.quick,
        show_cache=True,
    )


if __name__ == "__main__":
    main()
