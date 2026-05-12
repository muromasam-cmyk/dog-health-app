// api/subscribe.js - Vercel Serverless Function (CommonJS)
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

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
    }

    return res.status(200).json({ ok: true, key });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
};
