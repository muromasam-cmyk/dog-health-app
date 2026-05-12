# 🐾 ロンの心臓病管理アプリ（分離構成版）

## 構成

```
frontend/  → Vercel（React/Vite 静的サイト）
backend/   → Render.com（Express API + Cron）
```

この構成により、Vercelのビルドエラーを完全に回避できます。

---

## デプロイ手順

### ① バックエンド（Render.com）を先にデプロイ

1. `backend/` フォルダを **別の GitHub リポジトリ** に push

```bash
cd backend
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/YOUR/ron-heart-api.git
git push -u origin main
```

2. [render.com](https://render.com) → **New** → **Web Service**
3. GitHub リポジトリを選択
4. 以下を設定：

| 項目 | 値 |
|------|-----|
| Environment | **Node** |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Plan | **Free** |

5. **Environment Variables** に以下を追加（`.env.example` を参照）：

| 変数名 | 値 |
|--------|-----|
| `VAPID_PUBLIC_KEY` | `.env.example` に記載の値 |
| `VAPID_PRIVATE_KEY` | `.env.example` に記載の値 |
| `VAPID_CONTACT` | `mailto:あなたのメール` |
| `UPSTASH_REDIS_REST_URL` | Upstash の REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash の REST API Token |

6. **Create Web Service** → デプロイ完了後、URLをメモ
   - 例: `https://ron-heart-api.onrender.com`

7. 動作確認：ブラウザで以下にアクセス
   ```
   https://ron-heart-api.onrender.com/api/debug
   ```
   全項目 ✅ と `redis.status: ✅ 接続OK` が表示されれば成功

---

### ② フロントエンド（Vercel）をデプロイ

1. `frontend/` フォルダを **別の GitHub リポジトリ** に push

```bash
cd frontend
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/YOUR/ron-heart-frontend.git
git push -u origin main
```

2. [vercel.com](https://vercel.com) → **Add New Project** → リポジトリ選択
3. Framework: **Vite**（自動検出されます）
4. **Environment Variables** に以下を追加：

| 変数名 | 値 |
|--------|-----|
| `VITE_API_URL` | Render.com の URL（例: `https://ron-heart-api.onrender.com`） |

5. **Deploy** → 完了

---

### ③ iPhone で通知を設定

1. SafariでVercelのURLを開く
2. 共有ボタン（□↑）→「ホーム画面に追加」
3. ホーム画面のアイコンからアプリを起動
4. **通知タブ** → 「🔔 プッシュ通知を有効にする」
5. 「保存する」→「テスト」で通知が届けば完了！

---

## 注意事項

- **Render.com 無料プランはスリープあり**（15分間アクセスがないとスリープ）  
  Cron による毎分チェックで自動的に起き続けます
- バックエンドURLが変わった場合は、Vercelの環境変数 `VITE_API_URL` を更新してください
