// /api/send-push.js  - Vercel Serverless Function (Cron)
// Vercel Cron で毎分呼び出し → 設定時刻と一致する購読にプッシュ送信
//
// vercel.json の crons 設定で "0/1 * * * *"（毎分）で呼び出す

import { kv } from '@vercel/kv';
import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

export default async function handler(req, res) {
  // Vercel Cron からのみ受け付ける（Authorization ヘッダー確認）
  const cronSecret = req.headers['authorization'];
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 現在時刻（JST）HH:MM
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(jst.getUTCHours()).padStart(2,'0')}:${String(jst.getUTCMinutes()).padStart(2,'0')}`;

  console.log(`[send-push] Running at JST ${hhmm}`);

  // 全購読レコードのキー一覧取得
  let keys = [];
  let cursor = 0;
  do {
    const result = await kv.scan(cursor, { match: 'sub:*', count: 100 });
    cursor  = result[0];
    keys = keys.concat(result[1]);
  } while (cursor !== 0);

  let sent = 0, failed = 0, skipped = 0;

  await Promise.allSettled(keys.map(async key => {
    let record;
    try { record = JSON.parse(await kv.get(key)); } catch { return; }
    if (!record?.subscription) return;

    // 今の時刻と一致するスケジュールを探す
    const due = (record.schedules || []).filter(s => s.enabled && s.time === hhmm);
    if (!due.length) { skipped++; return; }

    for (const s of due) {
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({
            title: '🐾 お薬リマインダー',
            body: `${s.label}の時間です`,
            icon: '/icon-192.png',
            tag: `med-${s.label}-${hhmm}`,
          })
        );
        sent++;
        console.log(`[send-push] ✅ sent to ${key} (${s.label})`);
      } catch (err) {
        failed++;
        console.error(`[send-push] ❌ failed ${key}:`, err.statusCode, err.body);
        // 購読が無効（410 Gone）なら削除
        if (err.statusCode === 410 || err.statusCode === 404) {
          await kv.del(key);
          console.log(`[send-push] 🗑 deleted stale subscription ${key}`);
        }
      }
    }
  }));

  return res.status(200).json({ ok: true, hhmm, sent, failed, skipped, total: keys.length });
}
