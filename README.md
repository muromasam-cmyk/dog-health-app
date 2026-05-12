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

### 3. Upstash Redis を追加（無料）

**Vercel KVは2024年12月に廃止されました。代わりにUpstash Redisを使います。**

1. [upstash.com](https://upstash.com) にアクセス → **Start for free**（Googleアカウントで登録可）
2. **Create Database** → 名前を入力（例: `ron-heart`）→ リージョン: **ap-northeast-1（東京）** → **Create**
3. 作成後、**REST API** タブをクリック
4. 表示される以下の2つの値をコピー：
   - `UPSTASH_REDIS_REST_URL`（`https://xxxx.upstash.io` の形式）
   - `UPSTASH_REDIS_REST_TOKEN`（長い文字列）

### 4. 環境変数を設定

Vercelダッシュボード → プロジェクト → **Settings** → **Environment Variables** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VAPID_PUBLIC_KEY` | `.env.example` に記載の値 |
| `VAPID_PRIVATE_KEY` | `.env.example` に記載の値 |
| `VAPID_CONTACT` | `mailto:あなたのメールアドレス` |
| `UPSTASH_REDIS_REST_URL` | Upstashダッシュボードの REST API タブから取得 |
| `UPSTASH_REDIS_REST_TOKEN` | 同上 |
| `CRON_SECRET` | 任意のランダム文字列 |

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
