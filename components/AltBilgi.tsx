/**
 * 06-İLKELER §5 ve §8 — kaldırılamaz alt bilgi.
 *
 * Birinci paragraf metodun şeffaflığı, ikincisi kullanıcının korunması içindir;
 * ikisi de dosyada "kaldırılamaz" diye işaretlenmiştir. Metin birebirdir.
 * Altındaki künye §8 gereği arayüzde bulunmak zorundadır.
 */
export default function AltBilgi() {
  return (
    <footer
      className="mx-auto mt-4 w-full max-w-2xl border-t pt-6 text-center"
      style={{ borderColor: "var(--line)" }}
    >
      <p className="text-[13px] leading-relaxed text-muted">
        Mîzân bağımsız ikinci bir çağrıyla üretilir: tezi kuran ile onu yanlışlamaya
        çalışan aynı el değildir.
      </p>
      {/*
        Koruyucu uyarı paletin en okunaklı rengiyle basılır. Palet değişmiyor;
        yalnız hangi token'ın kullanıldığı değişiyor — --muted bu metinde
        4.5:1 eşiğinin altında kalıyordu.
      */}
      <p className="mt-3 text-[13px] leading-relaxed text-ink">
        Çıktılar bir başlangıç haritasıdır — hüküm değil. Hukukî, tıbbî ve dinî
        konularda ehline danışınız.
      </p>

      {/* Künye §8'de yazıldığı harflemeyle durur; etiket gibi büyütülmez. */}
      <p className="mt-6 text-[12px] text-muted">
        GZ · Gelişmiş Zekâ — Geometrik Okuma–Zincir Öğrenme Metodu
      </p>
      <p className="mt-1.5 text-[12px] text-muted">Ömer Faruk Durna · 6NGen</p>
    </footer>
  );
}
