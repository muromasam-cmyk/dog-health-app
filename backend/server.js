// backend/server.js
// Render.com 用 Express サーバー
// Web Push 購読管理 + Cron で毎分通知送信

const express  = require('express');
const webpush  = require('web-push');
const cron     = require('node-cron');
const { Redis } = require('@upstash/redis');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── VAPID 設定 ────────────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_CONTACT   || 'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Upstash Redis ─────────────────────────────────────────────────
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── ミドルウェア ──────────────────────────────────────────────────
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── GET / ヘルスチェック ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'ron-heart-api', time: new Date().toISOString() });
});

// ── GET /api/debug ─────────────────────────────────────────────────
app.get('/api/debug', async (req, res) => {
  const result = {
    timestamp: new Date().toISOString(),
    jst:       new Date(Date.now() + 9*60*60*1000).toISOString(),
    env: {
      VAPID_PUBLIC_KEY:         process.env.VAPID_PUBLIC_KEY         ? '✅ 設定済' : '❌ 未設定',
      VAPID_PRIVATE_KEY:        process.env.VAPID_PRIVATE_KEY        ? '✅ 設定済' : '❌ 未設定',
      VAPID_CONTACT:            process.env.VAPID_CONTACT            || '❌ 未設定',
      UPSTASH_REDIS_REST_URL:   process.env.UPSTASH_REDIS_REST_URL   ? '✅ 設定済' : '❌ 未設定',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ 設定済' : '❌ 未設定',
    },
    redis: { status: 'unknown', subscriptions: [] },
  };
  try {
    await redis.ping();
    result.redis.status = '✅ 接続OK';
    let allKeys = [], cursor = 0;
    do {
      const r     = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      const next  = Array.isArray(r) ? r[0] : r.cursor;
      const found = Array.isArray(r) ? r[1] : (r.keys || []);
      cursor  = typeof next === 'string' ? parseInt(next, 10) : (next || 0);
      allKeys = allKeys.concat(found);
    } while (cursor !== 0);
    result.redis.totalKeys = allKeys.length;
    for (const key of allKeys) {
      const raw    = await redis.get(key);
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
      result.redis.subscriptions.push({
        key:       key.slice(0, 30) + '…',
        endpoint:  (record?.subscription?.endpoint || '').slice(0, 60) + '…',
        schedules: record?.schedules,
        updatedAt: record?.updatedAt,
      });
    }
  } catch(e) { result.redis.status = `❌ ${e.message}`; }
  res.json(result);
});

// ── POST /api/subscribe ───────────────────────────────────────────
app.post('/api/subscribe', async (req, res) => {
  try {
    const { subscription, schedules, deviceId, sendTest } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    const key = `sub:${Buffer.from(subscription.endpoint).toString('base64').slice(0, 64)}`;
    await redis.set(key, JSON.stringify({
      subscription,
      schedules: schedules || [],
      deviceId:  deviceId  || 'unknown',
      updatedAt: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 365 });

    if (sendTest) {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '🐾 テスト通知',
        body:  'バックグラウンドでも届いています！',
        icon:  '/icon-192.png',
        tag:   'test',
      }));
      console.log('[subscribe] ✅ test notification sent');
    }
    return res.json({ ok: true, key });
  } catch(err) {
    console.error('[subscribe] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Cron: 毎分実行してスケジュール一致の購読にプッシュ ────────────
async function sendScheduledPush() {
  const now  = new Date();
  const jst  = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(jst.getUTCHours()).padStart(2,'0')}:${String(jst.getUTCMinutes()).padStart(2,'0')}`;
  console.log(`[cron] JST=${hhmm}`);

  let allKeys = [], cursor = 0;
  try {
    do {
      const r     = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      const next  = Array.isArray(r) ? r[0] : r.cursor;
      const found = Array.isArray(r) ? r[1] : (r.keys || []);
      cursor  = typeof next === 'string' ? parseInt(next, 10) : (next || 0);
      allKeys = allKeys.concat(found);
    } while (cursor !== 0);
  } catch(e) { console.error('[cron] redis scan error:', e.message); return; }

  console.log(`[cron] subscriptions: ${allKeys.length}`);

  let sent = 0;
  for (const key of allKeys) {
    try {
      const raw    = await redis.get(key);
      const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!record?.subscription) continue;

      const due = (record.schedules || []).filter(s => s.enabled && s.time === hhmm);
      for (const s of due) {
        try {
          await webpush.sendNotification(record.subscription, JSON.stringify({
            title: '🐾 お薬リマインダー',
            body:  `${s.label}の時間です`,
            icon:  '/icon-192.png',
            badge: '/icon-192.png',
            tag:   `med-${s.label.replace(/\s/g,'-')}-${hhmm}`,
          }));
          sent++;
          console.log(`[cron] ✅ sent: ${s.label}`);
        } catch(err) {
          console.error(`[cron] ❌ push error:`, err.statusCode, err.body || err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await redis.del(key).catch(() => {});
            console.log(`[cron] 🗑 removed stale: ${key}`);
          }
        }
      }
    } catch(e) { console.error('[cron] record error:', e.message); }
  }
  if (sent > 0) console.log(`[cron] sent ${sent} notifications`);
}

// 毎分実行
cron.schedule('* * * * *', sendScheduledPush);
console.log('[cron] scheduler started (every minute)');

// ── サーバー起動 ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
