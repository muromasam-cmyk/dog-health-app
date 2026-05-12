// /api/send-push.js  - Vercel Serverless Function (Cron)
// Vercel Cron で毎分呼び出し → 設定時刻と一致する購読にプッシュ送信

import { Redis } from '@upstash/redis';
import webpush from 'web-push';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

webpush.setVapidDetails(
  process.env.VAPID_CONTACT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const cronSecret = req.headers['authorization'];
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 現在時刻（JST）HH:MM
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(jst.getUTCHours()).padStart(2,'0')}:${String(jst.getUTCMinutes()).padStart(2,'0')}`;
  console.log(`[send-push] Running at JST ${hhmm}`);

  // 全購読キーを取得
  let keys = [];
  let cursor = 0;
  do {
    const [nextCursor, found] = await redis.scan(cursor, { match: 'sub:*', count: 100 });
    cursor = parseInt(nextCursor, 10);
    keys = keys.concat(found);
  } while (cursor !== 0);

  let sent = 0, failed = 0, skipped = 0;

  await Promise.allSettled(keys.map(async key => {
    let raw, record;
    try {
      raw    = await redis.get(key);
      record = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { return; }
    if (!record?.subscription) return;

    const due = (record.schedules || []).filter(s => s.enabled && s.time === hhmm);
    if (!due.length) { skipped++; return; }

    for (const s of due) {
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({
            title: '🐾 お薬リマインダー',
            body:  `${s.label}の時間です`,
            icon:  '/icon-192.png',
            tag:   `med-${s.label}-${hhmm}`,
          })
        );
        sent++;
        console.log(`[send-push] ✅ sent (${s.label})`);
      } catch (err) {
        failed++;
        console.error(`[send-push] ❌ failed:`, err.statusCode, err.body);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await redis.del(key);
          console.log(`[send-push] 🗑 deleted stale key ${key}`);
        }
      }
    }
  }));

  return res.status(200).json({ ok: true, hhmm, sent, failed, skipped, total: keys.length });
}
