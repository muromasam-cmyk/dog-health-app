// /api/subscribe.js  - Vercel Serverless Function
// プッシュ購読情報を受け取って保管 + テスト送信オプション

import { kv } from '@vercel/kv';
import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@example.com';

webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { subscription, schedules, deviceId, sendTest } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });

    const key = `sub:${Buffer.from(subscription.endpoint).toString('base64').slice(0, 64)}`;

    // 購読情報を保存
    await kv.set(key, JSON.stringify({
      subscription,
      schedules: schedules || [],
      deviceId: deviceId || 'unknown',
      updatedAt: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 365 });

    // テスト通知を即送信
    if (sendTest) {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '🐾 テスト通知',
        body: 'ロンの心臓病管理アプリからのテスト通知です！バックグラウンドでも届いています。',
        icon: '/icon-192.png',
        tag: 'test',
      }));
    }

    return res.status(200).json({ ok: true, key });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
