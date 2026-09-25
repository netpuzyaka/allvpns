import { getVpn } from '@/lib/store';

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

// Браузеры при обычной навигации почти всегда отправляют Accept: text/html.
// VPN-клиенты (Happ, v2rayNG, Shadowrocket, sing-box и т.п.) этого не делают.
// Для надёжности дополнительно смотрим на User-Agent.
function looksLikeBrowser(request) {
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;

  const ua = request.headers.get('user-agent') || '';
  const isBrowserUA = /Mozilla|Chrome|Safari|Firefox|Edg\//i.test(ua);
  const isKnownClientUA = /curl|wget|okhttp|python|go-http|v2ray|xray|clash|sing-box|happ|shadowrocket|nekoray/i.test(
    ua,
  );
  return isBrowserUA && !isKnownClientUA;
}

function renderPage({ title, heading, body }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 20% 20%, #142132 0%, #0f1620 60%);
    font-family: system-ui, -apple-system, sans-serif;
    color: #e7edf3;
    padding: 24px;
  }
  .card {
    max-width: 480px;
    width: 100%;
    background: #141d29;
    border: 1px solid #223046;
    border-radius: 14px;
    padding: 32px;
  }
  .eyebrow { font-size: 13px; color: #6fe3c4; margin: 0 0 10px; }
  h1 { font-size: 21px; margin: 0 0 14px; line-height: 1.35; }
  p { line-height: 1.6; color: #a9b7c6; margin: 0 0 14px; }
  .linkbox {
    font-family: ui-monospace, 'JetBrains Mono', monospace;
    font-size: 13px;
    background: #0b121b;
    border: 1px solid #223046;
    border-radius: 8px;
    padding: 12px 14px;
    word-break: break-all;
    color: #6fe3c4;
    margin: 6px 0 18px;
  }
  ol { padding-left: 20px; color: #cdd8e3; margin: 0; }
  ol li { margin-bottom: 8px; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">AllVPNs</p>
    <h1>${heading}</h1>
    ${body}
  </div>
</body>
</html>`;
}

export async function GET(request, { params }) {
  const { id } = params;
  const entry = await getVpn(id);
  const browser = looksLikeBrowser(request);

  if (!entry) {
    if (browser) {
      const html = renderPage({
        title: 'Ссылка не найдена · AllVPNs',
        heading: 'Такой ссылки не существует',
        body: '<p>Проверьте адрес или создайте новую ссылку на главной странице.</p>',
      });
      return new Response(html, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    return new Response('Not found', { status: 404 });
  }

  if (browser) {
    const origin = new URL(request.url).origin;
    const link = `${origin}/vpn/${id}`;
    const html = renderPage({
      title: 'VPN-подписка · AllVPNs',
      heading: 'Эту ссылку нужно вставить в приложение Happ',
      body: `
        ${entry.label ? `<p>Метка: ${escapeHtml(entry.label)}</p>` : ''}
        <p>Не открывайте её на телефоне как обычную страницу — скопируйте адрес и добавьте его как подписку в клиенте.</p>
        <div class="linkbox">${escapeHtml(link)}</div>
        <ol>
          <li>Откройте приложение Happ (или другой VLESS/VMess/Shadowsocks-клиент).</li>
          <li>Выберите пункт «Добавить подписку по ссылке».</li>
          <li>Вставьте адрес выше и сохраните — сервера подтянутся автоматически.</li>
        </ol>
      `,
    });
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Запрос пришёл от VPN-клиента — отдаём сырую конфигурацию как есть.
  return new Response(entry.content, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
