// api/debug.js - 診断用（確認後削除してください）
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  const result = {
    timestamp: new Date().toISOString(),
    jst:       new Date(Date.now() + 9*60*60*1000).toISOString(),
    env: {
      VAPID_PUBLIC_KEY:         process.env.VAPID_PUBLIC_KEY         ? '✅ 設定済' : '❌ 未設定',
      VAPID_PRIVATE_KEY:        process.env.VAPID_PRIVATE_KEY        ? '✅ 設定済' : '❌ 未設定',
      VAPID_CONTACT:            process.env.VAPID_CONTACT            || '❌ 未設定',
      UPSTASH_REDIS_REST_URL:   process.env.UPSTASH_REDIS_REST_URL   ? '✅ 設定済' : '❌ 未設定',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ 設定済' : '❌ 未設定',
      CRON_SECRET:              process.env.CRON_SECRET              ? '✅ 設定済' : '（未設定）',
    },
    redis: { status: 'unknown', subscriptions: [] },
  };

  try {
    await redis.ping();
    result.redis.status = '✅ 接続OK';

    let allKeys = [], cursor = 0;
    do {
      const r      = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      const next   = Array.isArray(r) ? r[0] : r.cursor;
      const found  = Array.isArray(r) ? r[1] : (r.keys || []);
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
        deviceId:  record?.deviceId,
      });
    }
  } catch (e) {
    result.redis.status = `❌ エラー: ${e.message}`;
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(result);
};
