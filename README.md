# Mac データ整理ツール集

写真やファイルがどこにあるかわからなくなる問題を解決する、Mac用データ整理ツール集です。

## ツール一覧

| ツール | 説明 | スクリプト |
|--------|------|-----------|
| ファイル自動整理 | デスクトップ・ダウンロードのファイルを種類別・日付別に自動分類 | `organize_files.py` |
| 重複ファイル検出 | ハッシュ値で重複ファイルを見つけてディスク容量を節約 | `find_duplicates.py` |
| 写真・動画整理 | EXIF撮影日時に基づいて年月フォルダに自動整理 | `organize_photos.py` |
| ブックマーク・メモ整理 | Safari/Chromeのブックマークとメモをカテゴリ別に構造化 | `organize_bookmarks.py` |
| ストレージ分析 | ディスク使用量の可視化、大きなファイル・キャッシュの特定 | `analyze_storage.py` |

## 必要環境

- macOS
- Python 3.10 以上
- 外部ライブラリ不要（標準ライブラリのみ使用）

## クイックスタート

### メニューから実行（おすすめ）

```bash
python3 scripts/mac_organizer.py
```

対話式メニューから各ツールを選んで実行できます。

### 個別に実行

#### 1. ファイル自動整理

```bash
# プレビュー（実際には移動しない）
python3 scripts/organize_files.py

# デスクトップも含めてプレビュー
python3 scripts/organize_files.py --desktop

# 日付別サブフォルダも作成してプレビュー
python3 scripts/organize_files.py --desktop --by-date

# 実際に移動を実行
python3 scripts/organize_files.py --desktop --execute
```

#### 2. 重複ファイル検出

```bash
# デフォルト（Downloads, Desktop, Documents を検索）
python3 scripts/find_duplicates.py

# 指定ディレクトリを検索
python3 scripts/find_duplicates.py ~/Pictures ~/Desktop

# 画像のみ検索
python3 scripts/find_duplicates.py --images-only

# 動画のみ検索
python3 scripts/find_duplicates.py --videos-only
```

#### 3. 写真・動画整理

```bash
# プレビュー
python3 scripts/organize_photos.py

# 年/月/日フォルダで整理をプレビュー
python3 scripts/organize_photos.py --format year-month-day

# コピーモードで実行（元ファイルを残す）
python3 scripts/organize_photos.py --execute --copy

# 移動モードで実行
python3 scripts/organize_photos.py --execute
```

#### 4. ブックマーク・メモ整理

```bash
# Safari + Chrome + Apple Notes
python3 scripts/organize_bookmarks.py

# Chromeのみ
python3 scripts/organize_bookmarks.py --chrome-only

# Safariのみ
python3 scripts/organize_bookmarks.py --safari-only
```

#### 5. ストレージ分析

```bash
# クイック分析
python3 scripts/analyze_storage.py --quick

# 詳細分析（大きなファイル・古いファイルも検索）
python3 scripts/analyze_storage.py

# 特定ディレクトリを分析
python3 scripts/analyze_storage.py --target ~/Documents --depth 3
```

## 安全設計

- **プレビューモード**: ファイル移動ツール（整理・写真）はデフォルトでプレビューのみ。`--execute` を付けるまで実際のファイル移動は行いません
- **コピーモード**: 写真整理は `--copy` オプションで元ファイルを残したまま整理可能
- **読み取り専用**: 重複検出・ストレージ分析・ブックマーク整理はファイルの読み取りのみ
- **レポート出力**: 結果はレポートファイルに保存。確認してから手動で対応できます

## 整理後のフォルダ構造例

```
~/Documents/整理済み/
├── 画像/
│   ├── 2024/
│   │   ├── 2024-01/
│   │   └── 2024-03/
│   └── 2025/
├── ドキュメント/
├── 動画/
├── アーカイブ/
└── ブックマーク/
    ├── bookmarks_organized.md
    ├── bookmarks_organized.json
    └── apple_notes_list.md

~/Pictures/整理済み/
├── 写真/
│   ├── 2023/
│   │   ├── 2023-08/
│   │   └── 2023-12/
│   └── 2024/
└── 動画/
    └── 2024/
```
