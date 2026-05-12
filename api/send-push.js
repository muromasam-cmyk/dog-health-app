// /api/send-push.js  - Vercel Serverless Function (Cron)
// Vercel Cron で定期呼び出し → 設定時刻と一致する購読にプッシュ送信

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
  // ── 認証 ──────────────────────────────────────────────────────
  // Vercel Cron は x-vercel-cron ヘッダーを付けて呼び出す
  // 直接 GET アクセスの場合は CRON_SECRET で保護
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const authHeader   = req.headers['authorization'];
  const cronSecret   = process.env.CRON_SECRET;

  if (!isVercelCron) {
    // Cron 以外からのアクセス: CRON_SECRET が設定されていれば照合
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // ── 現在時刻（JST） ───────────────────────────────────────────
  const now  = new Date();
  const jst  = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(jst.getUTCHours()).padStart(2,'0')}:${String(jst.getUTCMinutes()).padStart(2,'0')}`;
  console.log(`[send-push] ▶ JST=${hhmm} UTC=${now.toISOString()}`);

  // ── 全購読キーを取得（@upstash/redis の scan は {cursor,keys} を返す） ──
  let allKeys = [];
  let cursor  = 0;
  try {
    do {
      const result = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      // @upstash/redis v1.x: result = [nextCursor, keys[]]
      // @upstash/redis v2.x: result = { cursor, keys[] }
      const nextCursor = Array.isArray(result) ? result[0] : result.cursor;
      const found      = Array.isArray(result) ? result[1] : result.keys;
      cursor  = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : nextCursor;
      allKeys = allKeys.concat(found || []);
    } while (cursor !== 0);
  } catch (scanErr) {
    console.error('[send-push] scan error:', scanErr);
    return res.status(500).json({ error: 'Redis scan failed', detail: scanErr.message });
  }

  console.log(`[send-push] total subscriptions: ${allKeys.length}`);

  if (allKeys.length === 0) {
    return res.status(200).json({ ok: true, hhmm, message: 'No subscriptions found', sent: 0 });
  }

  // ── 各購読にプッシュ送信 ───────────────────────────────────────
  let sent = 0, failed = 0, skipped = 0;

  await Promise.allSettled(allKeys.map(async key => {
    let record;
    try {
      const raw = await redis.get(key);
      record    = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error(`[send-push] parse error ${key}:`, e);
      return;
    }
    if (!record?.subscription) { skipped++; return; }

    // 現在時刻と一致 & 有効なスケジュールを抽出
    const due = (record.schedules || []).filter(s => s.enabled && s.time === hhmm);
    console.log(`[send-push] key=${key.slice(0,20)}… schedules=${JSON.stringify(record.schedules)} due=${due.length}`);

    if (!due.length) { skipped++; return; }

    for (const s of due) {
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({
            title: '🐾 お薬リマインダー',
            body:  `${s.label}の時間です`,
            icon:  '/icon-192.png',
            badge: '/icon-192.png',
            tag:   `med-${s.label.replace(/\s/g,'-')}-${hhmm}`,
          })
        );
        sent++;
        console.log(`[send-push] ✅ sent: ${s.label}`);
      } catch (err) {
        failed++;
        console.error(`[send-push] ❌ webpush error:`, err.statusCode, err.body || err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await redis.del(key).catch(() => {});
          console.log(`[send-push] 🗑 deleted stale: ${key}`);
        }
      }
    }
  }));

  const result = { ok: true, hhmm, sent, failed, skipped, total: allKeys.length };
  console.log('[send-push] result:', result);
  return res.status(200).json(result);
}

