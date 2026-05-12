# 🐾 ロンの心臓病管理アプリ

## ローカル開発

```bash
npm install
npm run dev
```

## Vercel デプロイ（推奨）

```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/YOUR_NAME/ron-heart.git
git push -u origin main
```

vercel.com → Add New Project → GitHubリポジトリ選択 → Deploy

## データ保持について

データは `localStorage` のキー `ron_heart_v1` に保存されます。
**同じドメインに再デプロイする場合、データは自動で引き継がれます。**

### ドメインが変わる場合のデータ移行

**エクスポート（旧環境のコンソールで実行）:**
```js
copy(localStorage.getItem("ron_heart_v1"))
```

**インポート（新環境のコンソールで実行）:**
```js
localStorage.setItem("ron_heart_v1", '← コピーしたデータを貼り付け →')
```

## iPhone通知（PWA）

1. Safariでアプリを開く
2. 共有ボタン（□↑）→「ホーム画面に追加」
3. ホーム画面のアイコンから起動
4. 通知タブ →「通知を許可する」→「テスト」で動作確認

※ iOS 16.4以降・PWA限定

## ビルド設定

| 項目 | 値 |
|------|-----|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 18.x 以上 |
