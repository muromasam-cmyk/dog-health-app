# 🐾 ロンの心臓病管理アプリ（Web Push対応版）

アプリを**完全に閉じた状態・バックグラウンド**でもお薬通知が届きます。

---

## アーキテクチャ

```
iPhone（PWA）
  ↓ 購読情報を送信
Vercel API（/api/subscribe）→ Vercel KV（Redis）に保存
  ↑ 毎分 Cron 実行
Vercel API（/api/send-push）→ 設定時刻に Web Push 送信
  ↓
iPhone（バックグラウンドでも通知受信 ✅）
```

---

## デプロイ手順（Vercel）

### 1. GitHubにプッシュ

```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/YOUR_NAME/ron-heart.git
git push -u origin main
```

### 2. Vercelにデプロイ

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub リポジトリを選択
2. Framework: **Vite** が自動検出されます
3. **Deploy** をクリック

### 3. Vercel KV（データベース）を追加

1. Vercelダッシュボード → プロジェクト → **Storage** タブ
2. **Create Database** → **KV（Redis）** を選択
3. 作成すると `KV_REST_API_URL` と `KV_REST_API_TOKEN` が自動で環境変数に追加されます

### 4. 環境変数を設定

Vercelダッシュボード → プロジェクト → **Settings** → **Environment Variables** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VAPID_PUBLIC_KEY` | `BDn76JrB79Gdb2DY38aHgitFm5lmQG4-6RiAj5Tky0KIeIEAUN4SbvY3IUxqDahbZk-UZhS_BZVcZbZwmb75ojU` |
| `VAPID_PRIVATE_KEY` | `r1aQgjv5GWN6ySpAl9p-OMX72atZI5ovAb6gk23PDiE` |
| `VAPID_CONTACT` | `mailto:あなたのメールアドレス` |
| `CRON_SECRET` | 任意のランダム文字列（例: `abc123xyz`） |

設定後、**Redeploy** を実行してください。

### 5. iPhoneでPWAとしてインストール

1. Safari でデプロイされたURLを開く
2. 共有ボタン（□↑）→「**ホーム画面に追加**」
3. ホーム画面のアイコンからアプリを起動
4. **通知タブ** → 「**🔔 プッシュ通知を有効にする**」をタップ
5. 「**テスト**」ボタンで通知が届けば設定完了！

---

## ローカル開発

```bash
npm install
npm run dev
```

※ Web Push はHTTPS必須のため、ローカルではAPIは動作しません。  
通知機能のテストはVercelにデプロイ後に行ってください。

---

## データ保持について

データは `localStorage` のキー `ron_heart_v1` に保存されます。  
同じドメインへの再デプロイでは**データは自動で引き継がれます**。

### ドメインが変わる場合

**エクスポート（旧環境コンソール）:**
```js
copy(localStorage.getItem("ron_heart_v1"))
```

**インポート（新環境コンソール）:**
```js
localStorage.setItem("ron_heart_v1", '← コピーしたデータ →')
```

---

## ファイル構成

```
ron-heart-pwa/
├── src/
│   ├── App.jsx        ← メインアプリ（Web Push対応通知ページ含む）
│   └── main.jsx
├── public/
│   ├── sw.js          ← Service Worker（バックグラウンド通知受信）
│   ├── manifest.json  ← PWA設定
│   ├── icon-192.png
│   └── icon-512.png
├── api/
│   ├── subscribe.js   ← 購読情報の保存・テスト送信
│   └── send-push.js   ← Cron: 毎分実行・通知送信
├── index.html
├── package.json
├── vite.config.js
├── vercel.json        ← Cron設定（毎分）
├── .env.example       ← 環境変数テンプレート
└── README.md
```
