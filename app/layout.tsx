import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GZ — Dinamik Analiz",
  description:
    "Herhangi bir mevzuyu GZ Metodu'nun dört adımıyla analiz edip radyal ilim haritası olarak gösterir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang="tr" zorunlu: CSS ile büyütülen her metnin doğru harflenmesi buna bağlı.
  return (
    <html lang="tr">
      <body className="relative min-h-screen antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
