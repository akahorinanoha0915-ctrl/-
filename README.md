# 不動産×AI 独立チェックリスト PWA

スマホのホーム画面に追加できるチェックリストアプリです。

## ファイル構成

```
pwa-checklist/
├── index.html      ← メインページ
├── manifest.json   ← PWA設定
├── sw.js           ← Service Worker（オフライン対応）
└── README.md       ← このファイル
```

## GitHub Pagesで公開する手順

### 1. GitHubにリポジトリを作る
1. https://github.com にアクセス
2. 右上の「+」→「New repository」
3. Repository name: `checklist`（なんでもOK）
4. 「Public」を選択
5. 「Create repository」をクリック

### 2. ファイルをアップロードする
1. 作成したリポジトリの画面で「uploading an existing file」をクリック
2. このフォルダの中の4つのファイルをすべてドラッグ＆ドロップ
   - index.html
   - manifest.json
   - sw.js
3. 「Commit changes」をクリック

### 3. GitHub Pagesを有効にする
1. リポジトリの「Settings」タブをクリック
2. 左メニューの「Pages」をクリック
3. Source: 「Deploy from a branch」
4. Branch: 「main」→「/(root)」を選択
5. 「Save」をクリック

### 4. 完成！
数分後に以下のURLでアクセスできます：
```
https://あなたのGitHubユーザー名.github.io/checklist/
```

## スマホのホーム画面に追加する方法

### iPhoneの場合
1. Safariでアプリを開く
2. 下の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」をタップ
4. 「追加」をタップ

### Androidの場合
1. Chromeでアプリを開く
2. 右上の「⋮」をタップ
3. 「ホーム画面に追加」をタップ

## 機能
- ✅ チェック状態がブラウザに保存される（閉じても消えない）
- 📱 ホーム画面に追加してアプリとして使える
- 🌐 オフラインでも動く
- 📊 進捗バーでどこまで進んだか一目でわかる
