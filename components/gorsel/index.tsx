import type { Gorsel } from "@/lib/schema";

import GrafikGorsel from "./Grafik";
import SimulasyonGorsel from "./Simulasyon";
import SinirGorsel from "./Sinir";
import SurecGorsel from "./Surec";
import ZamanCizgisiGorsel from "./ZamanCizgisi";

/**
 * Görsel dağıtıcısı.
 *
 * `tur` alanı ayrık birliğin ayırıcısıdır; şemadan geçmeyen bir tür buraya
 * hiç ulaşamaz. Switch her kolu kapattığı için yeni bir tür eklendiğinde
 * derleyici burayı da güncellemeye zorlar — sessizce boş çizen bir hâl olmaz.
 */
export default function GorselAnlatim({ gorsel }: { gorsel: Gorsel }) {
  switch (gorsel.tur) {
    case "zaman-cizgisi":
      return <ZamanCizgisiGorsel veri={gorsel} />;
    case "sinir":
      return <SinirGorsel veri={gorsel} />;
    case "grafik":
      return <GrafikGorsel veri={gorsel} />;
    case "surec":
      return <SurecGorsel veri={gorsel} />;
    case "simulasyon":
      return <SimulasyonGorsel veri={gorsel} />;
  }
}
