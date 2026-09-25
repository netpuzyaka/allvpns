'use client';

import { useState } from 'react';

export default function Home() {
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, label }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать ссылку');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setContent('');
    setLabel('');
    setCopied(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // буфер обмена недоступен (например, без https) — молча игнорируем
    }
  }

  return (
    <main className="scene">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <p className="eyebrow">AllVPNs</p>

        {!result ? (
          <>
            <h1 id="modal-title">Добавьте VPN и получите ссылку-подписку</h1>
            <p className="hint">
              Вставьте конфигурацию или список ссылок (vless, vmess, ss, trojan — можно по одной в строке).
              Получите адрес вида <code>allvpns.vercel.app/vpn/a34fgf54d</code>, который отдаётся клиенту как
              подписка.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Название (необязательно)</span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Например: Германия, домашний сервер"
                  maxLength={80}
                />
              </label>
              <label className="field">
                <span>Конфигурация VPN</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="vless://... или vmess://... — можно несколько строк"
                  rows={8}
                  required
                />
              </label>
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? 'Создаём ссылку…' : 'Создать ссылку'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 id="modal-title">Ссылка готова</h1>
            <p className="hint">
              Отправьте этот адрес пользователю Happ (или другого VLESS/VMess-клиента). При открытии в браузере
              там появится инструкция, а само приложение получит конфигурацию.
            </p>
            <div className="linkbox">{result.url}</div>
            <div className="actions">
              <button onClick={copyLink}>{copied ? 'Скопировано' : 'Скопировать ссылку'}</button>
              <button className="ghost" onClick={reset} type="button">
                Добавить ещё
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
