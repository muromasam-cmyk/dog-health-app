# 🐾 ロンの心臓病管理アプリ

SRR（安静時呼吸数）測定・お薬管理・体調記録・履歴チャートをまとめたモバイル対応Webアプリです。

---

## ⚠️ データ保持について（重要）

データは **ブラウザのlocalStorage** に保存されています（キー名: `ron_heart_v1`）。

### ✅ データが自動的に引き継がれるケース
- 同じブラウザ・同じドメインにデプロイする場合
  - 例：以前も `https://ron-heart.vercel.app` を使っていて、同じURLに再デプロイする場合
- ローカル開発で `npm run dev` を実行する場合（localhost は別扱い）

### ⚠️ データが引き継がれないケース（手動移行が必要）
- **ドメインが変わる場合**（例：`abc.vercel.app` → `ron-heart.vercel.app`）
- **別のブラウザ・別の端末**に移行する場合
- **Safari → Chrome** など異なるブラウザに変える場合

### 📦 データのエクスポート・インポート方法

**エクスポート（現在のブラウザでデータを取り出す）:**
1. 現在使っているブラウザで開発者ツールを開く（F12 または右クリック→検証）
2. 「コンソール」タブを開いて以下を貼り付けて実行：
```js
copy(localStorage.getItem("ron_heart_v1"))
```
3. クリップボードにコピーされるので、テキストファイルに貼り付けて保存

**インポート（新しいドメイン・ブラウザにデータを移す）:**
1. 新しい環境でアプリを開き、開発者ツールのコンソールで以下を実行：
```js
localStorage.setItem("ron_heart_v1", '← ここにエクスポートしたJSONを貼り付け ←')
```
2. ページをリロードするとデータが復元されます

---

## 機能一覧

- **SRR測定** — 15秒タイマー＋タップカウント、40回/分以上で警告
- **マイク録音** — リアルタイム音声波形表示・PNG保存
- **お薬管理** — DSピモハート・利尿剤の朝晩チェック（履歴にも自動記録）
- **体調記録** — 飲水量・排尿量・排尿色・動画記録・インライン再生
- **履歴チャート** — 日/週/月/年フィルター付きSRR推移グラフ
- **診察前レポート** — A4 PDF形式で出力（服薬履歴も含む）
- **かかりつけ病院** — 電話・SMSワンタップ
- **通知リマインダー** — お薬時間をブラウザ通知（PWA必須）
- **ダークモード** 対応
- **データ永続化** — localStorage（最大3年分）

---

## ローカル開発

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。

---

## Vercel へのデプロイ

### 方法①：GitHub 経由（推奨）

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_NAME/ron-heart.git
git push -u origin main
```

1. [vercel.com](https://vercel.com) にログイン
2. **Add New Project** → GitHubリポジトリを選択
3. Framework Preset: **Vite** が自動検出されます
4. **Deploy** をクリック → 数分で完了

### 方法②：Vercel CLI（最速）

```bash
npm install -g vercel
vercel
```

### 方法③：Netlify ドラッグ＆ドロップ

```bash
npm run build
```

`dist` フォルダを [netlify.com](https://netlify.com) にドラッグ＆ドロップ。

---

## ビルド設定

| 項目 | 値 |
|------|-----|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 18.x 以上 |

---

## iPhoneで通知を受け取るには（PWA）

1. Safariでアプリを開く
2. 共有ボタン（□↑）→「ホーム画面に追加」
3. ホーム画面のアイコンからアプリを起動
4. 通知タブで「通知を許可する」をタップ

※ iOS 16.4以降・Safari限定。ホーム画面追加後のアプリ起動中のみ通知が届きます。

---

## データ保存キー

| キー | 内容 |
|------|------|
| `ron_heart_v1` | 全データ（SRR記録・服薬ログ・病院情報・通知設定） |

