# 🐾 愛犬の心臓病管理アプリ

SRR（安静時呼吸数）測定・お薬管理・体調記録・履歴チャートをまとめたモバイル対応Webアプリです。

## 機能一覧

- **SRR測定** — 15秒タイマー＋タップカウント、40回/分以上で警告
- **マイク録音** — リアルタイム音声波形表示
- **お薬管理** — フォルテコールプラス・利尿剤の朝晩チェック
- **体調記録** — 飲水量・排尿量・排尿色・動画記録
- **履歴チャート** — 日/週/月/年フィルター付きSRR推移グラフ
- **診察前レポート** — HTML形式で出力
- **かかりつけ病院** — 電話・SMSワンタップ
- **通知リマインダー** — お薬時間をブラウザ通知
- **ダークモード** 対応
- **データ永続化** — localStorage（最大3年分）

## ローカル開発

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。

## Vercel へのデプロイ

### 方法①：GitHub 経由（推奨）

1. このフォルダを GitHub の新しいリポジトリにプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_NAME/dog-heart-monitor.git
git push -u origin main
```

2. [vercel.com](https://vercel.com) にログイン
3. **Add New Project** → GitHub リポジトリを選択
4. Framework Preset: **Vite** が自動検出されます
5. **Deploy** をクリック → 数分で完了

### 方法②：Vercel CLI

```bash
npm install -g vercel
vercel
```

プロンプトに従って設定するだけでデプロイ完了。

### 方法③：Netlify

1. `npm run build` を実行
2. [netlify.com](https://netlify.com) → **Deploy** → `dist` フォルダをドラッグ＆ドロップ

## ビルド設定（Vercel/Netlify 自動検出）

| 項目 | 値 |
|------|-----|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 18.x 以上 |

## 注意事項

- マイク機能は **HTTPS 環境でのみ動作**します（Vercel/Netlifyは自動でHTTPS）
- データはブラウザのlocalStorageに保存されるため、端末をまたいだ同期は行われません
- プッシュ通知はページを開いている間のみ有効です
