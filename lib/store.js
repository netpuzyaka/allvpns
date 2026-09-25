// Простое хранилище "id -> конфиг" поверх Redis REST API (Upstash / Vercel KV).
// Serverless-функции на Vercel не хранят состояние между вызовами, поэтому
// без внешней базы ссылки будут "теряться" после каждого холодного старта.
// Локально (без переменных окружения) используется in-memory Map — этого
// достаточно для разработки, но не для продакшена.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const memoryStore = new Map();

async function kvCommand(command) {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Ошибка хранилища: ${res.status}`);
  }
  return res.json();
}

export function hasPersistentStore() {
  return Boolean(KV_URL && KV_TOKEN);
}

export async function saveVpn(id, data) {
  const payload = JSON.stringify(data);
  if (hasPersistentStore()) {
    await kvCommand(['SET', `vpn:${id}`, payload]);
  } else {
    memoryStore.set(id, payload);
  }
}

export async function getVpn(id) {
  if (hasPersistentStore()) {
    const { result } = await kvCommand(['GET', `vpn:${id}`]);
    return result ? JSON.parse(result) : null;
  }
  const raw = memoryStore.get(id);
  return raw ? JSON.parse(raw) : null;
}
