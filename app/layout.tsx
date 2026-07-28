import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GZ — Dinamik Analiz",
  description:
    "Herhangi bir mevzuyu GZ Metodu'nun dört adımıyla analiz edip radyal ilim haritası olarak gösterir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="tr" zorunlu: CSS ile büyütülen her metnin doğru harflenmesi buna bağlı
  // (04-TASARIM §2, 01-MİMARİ §6).
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="relative min-h-screen antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
