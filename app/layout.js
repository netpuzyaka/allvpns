import './globals.css';

export const metadata = {
  title: 'AllVPNs — ссылки-подписки для VPN',
  description: 'Сохраните VPN-конфигурацию и получите одну ссылку для клиента.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
