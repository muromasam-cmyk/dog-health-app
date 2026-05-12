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

## トラブルシューティング：通知が届かない場合

### ステップ1: 診断エンドポイントで確認

デプロイ後にブラウザで以下にアクセス：

```
https://あなたのドメイン/api/debug
```

以下を確認してください：

| 項目 | 正常な状態 |
|------|-----------|
| `VAPID_PUBLIC_KEY` | ✅ 設定済 |
| `VAPID_PRIVATE_KEY` | ✅ 設定済 |
| `UPSTASH_REDIS_REST_URL` | ✅ 設定済 |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ 設定済 |
| `redis.status` | ✅ 接続OK |
| `redis.totalKeys` | 1以上（購読済みの場合） |
| `subscriptions[].schedules` | 時刻とenabledが正しいこと |

### ステップ2: Cronが動いているか確認

Vercelダッシュボード → プロジェクト → **Logs** タブ → Function: `/api/send-push` でフィルタ

`[send-push] ▶ JST=HH:MM` のログが5分ごとに記録されているか確認。

### ステップ3: よくある原因

| 原因 | 対処 |
|------|------|
| 購読データがRedisにない | 通知タブで「プッシュ通知を有効にする」を再実行 |
| スケジュールの時刻がズレている | 「保存する」を押して時刻を再送信 |
| Cronが5分間隔のため最大5分遅れる | 仕様です（Vercel Hobbyプランの制限） |
| iPhoneでPWAとして起動していない | Safari → 共有 → ホーム画面に追加 → アイコンから起動 |
| Vercelにデプロイ後Redeployしていない | 環境変数設定後に必ずRedeployを実行 |

### 確認後は /api/debug を削除

`api/debug.js` は診断用です。動作確認後は削除してください。



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
