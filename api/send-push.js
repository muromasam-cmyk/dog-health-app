// api/send-push.js - Vercel Serverless Function / Cron (CommonJS)
const { Redis } = require('@upstash/redis');
const webpush   = require('web-push');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

webpush.setVapidDetails(
  process.env.VAPID_CONTACT || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  // ── 認証 ──────────────────────────────────────────────────────
  // Vercel Cron は x-vercel-cron:1 ヘッダーで呼び出す
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const cronSecret   = process.env.CRON_SECRET;
  if (!isVercelCron && cronSecret) {
    if (req.headers['authorization'] !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // ── 現在時刻（JST HH:MM） ─────────────────────────────────────
  const now  = new Date();
  const jst  = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(jst.getUTCHours()).padStart(2,'0')}:${String(jst.getUTCMinutes()).padStart(2,'0')}`;
  console.log(`[send-push] JST=${hhmm} UTC=${now.toISOString()}`);

  // ── 全購読キーを取得 ───────────────────────────────────────────
  let allKeys = [];
  let cursor  = 0;
  try {
    do {
      const result     = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      const nextCursor = Array.isArray(result) ? result[0] : result.cursor;
      const found      = Array.isArray(result) ? result[1] : (result.keys || []);
      cursor  = typeof nextCursor === 'string' ? parseInt(nextCursor, 10) : (nextCursor || 0);
      allKeys = allKeys.concat(found);
    } while (cursor !== 0);
  } catch (e) {
    console.error('[send-push] Redis scan error:', e.message);
    return res.status(500).json({ error: 'Redis scan failed', detail: e.message });
  }

  console.log(`[send-push] subscriptions found: ${allKeys.length}`);
  if (allKeys.length === 0) {
    return res.status(200).json({ ok: true, hhmm, message: 'No subscriptions', sent: 0 });
  }

  // ── 各購読にプッシュ送信 ───────────────────────────────────────
  let sent = 0, failed = 0, skipped = 0;

  await Promise.allSettled(allKeys.map(async key => {
    let record;
    try {
      const raw = await redis.get(key);
      record    = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error(`[send-push] parse error ${key}:`, e.message);
      return;
    }
    if (!record?.subscription) { skipped++; return; }

    const due = (record.schedules || []).filter(s => s.enabled && s.time === hhmm);
    console.log(`[send-push] key=${key.slice(0,20)} schedules=${JSON.stringify(record.schedules)} due=${due.length}`);

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
        console.error(`[send-push] ❌ error:`, err.statusCode, err.body || err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await redis.del(key).catch(() => {});
          console.log(`[send-push] 🗑 removed stale: ${key}`);
        }
      }
    }
  }));

  const result = { ok: true, hhmm, sent, failed, skipped, total: allKeys.length };
  console.log('[send-push] done:', result);
  return res.status(200).json(result);
};
