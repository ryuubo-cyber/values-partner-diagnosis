#!/usr/bin/env python3
"""
Mac データ整理ツール - メインランチャー
すべての整理ツールを簡単に実行できる統合メニューです。
"""

import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent


def print_header():
    print("""
╔══════════════════════════════════════════════════════════╗
║           Mac データ整理ツール                          ║
║           〜 ファイルの迷子をなくそう 〜                 ║
╚══════════════════════════════════════════════════════════╝
    """)


def print_menu():
    print(" 実行したいツールの番号を入力してください:\n")
    print("  1. ファイル自動整理")
    print("     → デスクトップ・ダウンロードのファイルを種類別に分類")
    print()
    print("  2. 重複ファイル検出")
    print("     → 同じファイルを見つけてディスク容量を節約")
    print()
    print("  3. 写真・動画整理")
    print("     → 撮影日時に基づいて年月フォルダに自動整理")
    print()
    print("  4. ブックマーク・メモ整理")
    print("     → Safari/Chromeのブックマークをカテゴリ別に整理")
    print()
    print("  5. ストレージ分析")
    print("     → ディスク使用量を可視化し不要ファイルを特定")
    print()
    print("  6. 全ツールを順番に実行 (プレビューモード)")
    print()
    print("  q. 終了")
    print()


def run_script(script_name, args=None):
    """スクリプトを実行する"""
    script_path = SCRIPT_DIR / script_name
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)

    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n 中断しました。")
    except FileNotFoundError:
        print(f"\n エラー: {script_path} が見つかりません。")


def main():
    print_header()

    while True:
        print_menu()
        choice = input(" 番号を入力 > ").strip()

        if choice == "1":
            print("\n ファイル自動整理を実行します (プレビューモード)")
            print(" ※実際に移動するには後で --execute オプションを付けてください\n")
            run_script("organize_files.py", ["--desktop"])

        elif choice == "2":
            print("\n 重複ファイル検出を実行します\n")
            run_script("find_duplicates.py")

        elif choice == "3":
            print("\n 写真・動画整理を実行します (プレビューモード)\n")
            run_script("organize_photos.py")

        elif choice == "4":
            print("\n ブックマーク・メモ整理を実行します\n")
            run_script("organize_bookmarks.py")

        elif choice == "5":
            print("\n ストレージ分析を実行します\n")
            run_script("analyze_storage.py", ["--quick"])

        elif choice == "6":
            print("\n すべてのツールを順番に実行します (プレビューモード)\n")
            print("=" * 60)
            run_script("organize_files.py", ["--desktop"])
            print("\n" + "=" * 60)
            run_script("find_duplicates.py")
            print("\n" + "=" * 60)
            run_script("organize_photos.py")
            print("\n" + "=" * 60)
            run_script("organize_bookmarks.py")
            print("\n" + "=" * 60)
            run_script("analyze_storage.py", ["--quick"])

        elif choice.lower() == "q":
            print("\n お疲れさまでした！")
            break

        else:
            print("\n 1〜6の番号、または q を入力してください。")

        print()
        input(" Enterキーでメニューに戻ります...")
        print()


if __name__ == "__main__":
    main()
