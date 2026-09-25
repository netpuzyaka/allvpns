// Хранилище "id -> конфиг" поверх приватного Vercel Blob Store.
// Приватный store требует авторизации на каждое чтение и запись — писать
// нужно с access: 'private', а читать через SDK-метод get() (прямой URL
// вида https://<store-id>.private.blob.vercel-storage.com/... недоступен
// без токена/OIDC, поэтому просто fetch() по нему не сработает).
//
// На Vercel SDK по умолчанию аутентифицируется через OIDC — достаточно,
// что store подключён к проекту (переменная BLOB_STORE_ID добавляется
// автоматически), явный токен передавать не нужно.
//
// Локально (без подключённого Blob Store) используется in-memory Map —
// этого достаточно для разработки, но не для продакшена.

import { put, get } from '@vercel/blob';

const memoryStore = new Map();

function blobPath(id) {
  return `vpn/${id}.json`;
}

export function hasPersistentStore() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveVpn(id, data) {
  const payload = JSON.stringify(data);

  if (hasPersistentStore()) {
    await put(blobPath(id), payload, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return;
  }

  memoryStore.set(id, payload);
}

export async function getVpn(id) {
  if (!hasPersistentStore()) {
    const raw = memoryStore.get(id);
    return raw ? JSON.parse(raw) : null;
  }

  try {
    const result = await get(blobPath(id), { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    // Записи с таким id нет в хранилище — трактуем как "не найдено".
    return null;
  }
}
