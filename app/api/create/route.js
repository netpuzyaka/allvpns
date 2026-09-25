import { NextResponse } from 'next/server';
import { saveVpn, getVpn, hasPersistentStore } from '@/lib/store';
import { generateId } from '@/lib/id';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 80) : '';

  if (!content) {
    return NextResponse.json(
      { error: 'Пустой конфиг. Вставьте текст подписки или VPN-ссылку.' },
      { status: 400 },
    );
  }
  if (content.length > 200_000) {
    return NextResponse.json({ error: 'Слишком большой объём данных.' }, { status: 400 });
  }

  let id = generateId();
  // На случай редкого совпадения id — пробуем ещё несколько раз.
  for (let attempts = 0; attempts < 5 && (await getVpn(id)); attempts += 1) {
    id = generateId();
  }

  try {
    await saveVpn(id, { content, label, createdAt: Date.now() });
  } catch (err) {
    console.error('saveVpn failed:', err);
    return NextResponse.json(
      { error: 'Не удалось сохранить в хранилище. Проверьте, что Blob Store подключён к проекту.' },
      { status: 500 },
    );
  }

  const origin = request.headers.get('origin') || new URL(request.url).origin;

  return NextResponse.json({
    id,
    url: `${origin}/vpn/${id}`,
    persistent: hasPersistentStore(),
  });
}
