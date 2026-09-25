// Хранилище "id -> конфиг" поверх Vercel Blob.
// Blob — это не key-value база, а файловое хранилище: каждая запись
// сохраняется как отдельный файл по пути `vpn/<id>.json`, и мы читаем его
// обратно по тому же пути. Это полностью переживает границы между
// serverless-функциями (в отличие от памяти процесса).
//
// Локально (без подключённого Blob Store) используется in-memory Map —
// этого достаточно для разработки, но не для продакшена.

import { put, list } from '@vercel/blob';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

const memoryStore = new Map();

function blobPath(id) {
  return `vpn/${id}.json`;
}

export function hasPersistentStore() {
  return Boolean(BLOB_TOKEN);
}

export async function saveVpn(id, data) {
  const payload = JSON.stringify(data);

  if (hasPersistentStore()) {
    await put(blobPath(id), payload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });
    return;
  }

  memoryStore.set(id, payload);
}

export async function getVpn(id) {
  if (hasPersistentStore()) {
    const path = blobPath(id);
    const { blobs } = await list({ prefix: path, limit: 1 });
    const match = blobs.find((b) => b.pathname === path);
    if (!match) return null;

    const res = await fetch(match.url, { cache: 'no-store' });
    if (!res.ok) return null;

    const text = await res.text();
    return JSON.parse(text);
  }

  const raw = memoryStore.get(id);
  return raw ? JSON.parse(raw) : null;
}
