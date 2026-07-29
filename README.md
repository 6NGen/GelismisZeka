# GZ — Dinamik Analiz

Girilen herhangi bir mevzuyu GZ Metodu'nun (Geometrik Okuma – Zincir Öğrenme)
dört adımıyla analiz edip **radyal ilim haritası** olarak gösteren web uygulaması.

| Adım | Soru | Çıktı |
|---|---|---|
| 1 | Bu nedir? | Cevheri tanımlayan 4 dal |
| 2 | Bu ne değildir? | Karıştırılan 4 şey |
| 3 | Bu neye bağlıdır? | Bağlı olduğu 5 ilim |
| 4 | Mîzân | 3 iddianın asimetri testi |

---

## Kurulum

```bash
npm install
cp .env.example .env.local     # GEMINI_API_KEY değerini doldurun
npm run dev
```

Anahtar [Google AI Studio](https://aistudio.google.com/apikey)'dan alınır.
`GEMINI_API_KEY` **yalnız sunucuda** okunur; `/api/analyze` route'u dışında
hiçbir yere geçmez ve istemci paketine girmez. Anahtar tanımlı değilken de
uygulama açılır — önbellekli örnekler model çağrısı yapmadan çalışır.

| Değişken | Zorunlu | Varsayılan |
|---|---|---|
| `GEMINI_API_KEY` | Canlı analiz için evet | — |
| `GZ_MODEL` | Hayır | `gemini-2.5-flash` |

Sağlayıcıya bağlı tek dosya `lib/model.ts`'tir; promptlar, şema, içerik
kuralları ve Mîzân yalıtımı sağlayıcıdan bağımsızdır.

---

## İki derleme kipi

| Komut | Ne üretir | Canlı analiz |
|---|---|---|
| `npm run build` | Tam uygulama (sunucu + `/api/analyze`) | Var |
| `npm run build:static` | `out/` — GitHub Pages için statik tanıtım | **Yok** |

Statik kip, `output: "export"` sunucu route'larıyla çalışmadığı için `app/api`
dizinini derleme süresince ağacın dışına alır ve iş bitince yerine koyar.
Bu sürümde yalnız önbellekli örnekler açılır; yeni bir mevzu yazıldığında
kullanıcıya canlı analizin kapalı olduğu açıkça söylenir.

**Statik tanıtımın avantajı:** ortada API anahtarı da açık uç nokta da yoktur,
dolayısıyla maliyet riski taşımaz.

`.github/workflows/pages.yml` bu çıktıyı yayınlar. Depo ayarlarında
**Settings → Pages → Source: GitHub Actions** seçili olmalıdır. Adres
`https://<kullanıcı>.github.io/<depo>/` biçimindedir ve `basePath` depo adından
otomatik türetilir.

---

## Yayın (tam sürüm) ve maliyet uyarısı

Canlı analizin çalıştığı tam sürüm bir sunucu ister (Vercel vb.). Basmadan önce:

- `GEMINI_API_KEY` platformun **ortam değişkeni** olarak tanımlanmalıdır;
  `.env.local` deploy edilmez ve `.gitignore`'dadır.
- **Hız sınırı süreç belleğindedir.** Sunucusuz ortamlarda her örnek kendi
  sayacını tutar ve örnekler yenilendikçe sayaç sıfırlanır; yani "IP başına
  20/saat" pratikte "örnek başına 20/saat"e dönüşür. Her analiz 4 model
  çağrısıdır. Halka açık bir adreste bu, doğrudan bir maliyet açığıdır.
- Faz 2'ye (paylaşımlı Redis sayacı) kadar erişimi kısıtlı tutmak — deploy
  koruması ve sağlayıcı tarafında harcama tavanı — önerilir.

### Vercel Hobby adımları

1. Vercel'de **Add New → Project** ile bu depo içe aktarılır. Framework
   kendiliğinden Next.js olarak tanınır; derleme komutu `npm run build`'dir
   (statik kip yalnız `GZ_STATIC=1` ile devreye girer, Vercel'de girmez).
2. **Settings → Environment Variables** altına `GEMINI_API_KEY` eklenir.
   Anahtar yalnız buraya girilir; depoya, `.env.example`'a veya herhangi bir
   sohbete yazılmaz.
3. Deploy sonrası `/api/analyze` çalışır ve canlı analiz açılır.

Ücretsiz katmanın sınırı dakikadaki/gündeki istek sayısıdır. Her analiz **4
model çağrısı** eder; sınır aşıldığında sağlayıcı 429 döner ve uygulama bunu
`RATE` olarak gösterip kullanıcıyı hazır örneklere yönlendirir — çökmez.

---

## Kritik mimari kural — çift çağrılı Mîzân

Dördüncü adım, ilk üç adımın çıktısını **görmeden** çalışan bağımsız bir API
çağrısıdır. Tek çağrıda model kendi cevabını kendisi tartar; bu, metodun tam
olarak engellemek istediği otomatikleşmiş öz-doğrulamadır.

> Tezi kuran el ile onu yıkmaya çalışan el aynı olmamalıdır.

Bu, niyetle değil **imzayla** korunur: `lib/prompts.ts` içindeki hiçbir fonksiyon
önceki adımların sonucunu parametre olarak almaz. Mîzân çağrısının gövdesinde
yalnızca `topic` bulunur. Bu bağımsızlık uçtan uca sınanmıştır.

---

## Dizin yapısı

```
app/
  layout.tsx            lang="tr" — Türkçe büyütmenin doğru çalışması buna bağlı
  page.tsx              tek sayfa uygulama, dört çağrının sıralanması
  globals.css           tasarım token'ları
  api/analyze/route.ts  POST — tek adım analiz
components/
  AskBar.tsx            soru girişi + örnek çipleri
  ProgressSteps.tsx     4 adım göstergesi
  ModePicker.tsx        NEDİR / NE DEĞİLDİR / NEYE BAĞLIDIR / MÎZÂN
  RadialMap.tsx         merkez + dallar + SVG bağlar
  SerhPanel.tsx         kelime → cümle → paragraf
  MizanBar.tsx          tez/karşı ağırlık çubuğu
lib/
  prompts.ts            dört modun prompt tanımları + çıktı sözleşmesi
  schema.ts             zod şemaları + TS tipleri
  modes.ts              mod sabitleri, mîzân hükmü (zod'suz — istemci paketi için)
  model.ts              API çağrısı, JSON ayıklama, tek tekrar
  cache.ts              önbellekli örnekler
  sanitize.ts           model çıktısının temizlenmesi + safeRich
  rate-limit.ts         IP başına 20 istek/saat
  turkish.ts            toLocaleUpperCase("tr") sarmalayıcıları
data/cached/
  definecilik.json      elle yazılmış tam örnek
```

`lib/schema.ts` ile `lib/modes.ts` ayrımı bilinçlidir: bileşenlerin ihtiyaç
duyduğu çalışma-zamanı sabitleri zod'suz dosyada durur, böylece doğrulama
kitaplığı istemci paketine girmez.

---

## Veri şeması

Dört modun tamamı aynı dal biçimini kullanır; şerh üç katman hâlinde açılır:
**KELİME → CÜMLE → PARAGRAF**. Yalnız mîzân modunda dala `mizan` alanı eklenir.

```ts
interface Branch {
  name: string;      // dal adı — en fazla 4 kelime
  ar?: string;       // Arapça terim (emin değilse boş)
  word: string;      // KELİME — tek anahtar kelime
  sentence: string;  // CÜMLE — tek cümle, ≤15 kelime
  para: string;      // PARAGRAF — 2-3 cümle, sınırlı <b>/<i>
  mizan?: { tez: number; karsi: number };  // 0-10
}
```

İstenen dal sayısı 4 / 4 / 5 / 3'tür; model sapabildiği için arayüz 3–6 arası
her sayıyı çizer.

### Mîzân hükmü modele sorulmaz

Model yalnızca `tez` ve `karsi` sayılarını verir. "Hangi taraf ağır basıyor"
cümlesi `lib/modes.ts` içindeki `verdict()` ile istemcide hesaplanır — tartıyı
yapanın kendi tartısını yorumlamaması için. Çubuk genişliği
`tez / (tez + karsi)` oranıdır; payda `|| 1` ile korunur, bu yüzden `0 – 0`
girdisi NaN üretmez.

Aynı gerekçeyle mîzân modunda `word` alanı sunucuda sayılardan türetilir:
model "Tez 3 — Karşı 7" yazıp `{tez: 1, karsi: 9}` verirse ekran kendisiyle
çelişmesin diye sayı esas alınır.

---

## API sözleşmesi

`POST /api/analyze`

```ts
// istek
{ topic: string; step: "nedir" | "nedegildir" | "bagli" | "mizan" }

// 200
{ ok: true; data: { foot: string; branches: Branch[] } }

// hata
{ ok: false; error: string; code: "RATE" | "PARSE" | "UPSTREAM" | "INPUT" }
```

Route sırasıyla: girdiyi doğrular (2–120 karakter, kontrol karakteri yok),
hız sınırını uygular, modeli çağırır, cevabı zod ile doğrular, sanitize eder ve
temizlenmiş nesneyi **bir kez daha** doğrular — temizlik bir alanı boşaltmışsa
bu yakalanır. Şema tutmazsa bir kez sessizce tekrar dener; hız sınırı ve
bağlantı hatalarında tekrar denemez — beklemek çözüm değildir.

---

## HTML güvenliği

`para` ve `foot` alanlarında yalnız `<b>` ve `<i>` serbesttir; `name`, `word`,
`sentence`, `ar` tam kaçışlı basılır. İki bağımsız katman vardır:

1. **Sunucu** (`sanitizeModeResult`) — izinli etiketleri küçük harfe indirger,
   sonra kalan bütün etiketleri siler. `<script>`, `<img onerror>`,
   `<b onclick>`, `<iframe>` buradan geçemez.
2. **İstemci** (`safeRich`) — basmadan önce her şeyi kaçışlar, ardından yalnız
   `<b>`/`<i>` çiftlerini geri açar. Son kapı budur; `dangerouslySetInnerHTML`
   yalnızca bu fonksiyonun çıktısıyla kullanılır.

Birinci katman atlansa ikincisi hâlâ tutar. Düşmanca model çıktısıyla
sınanmıştır: betik çalışmaz, olay işleyicisi kalmaz, `<b>`/`<i>` korunur.

---

## Hata davranışı

| Durum | Davranış |
|---|---|
| Ağ hatası | Adım "alınamadı" işaretlenir, tekrar dene düğmesi çıkar |
| JSON bozuk | Bir kez sessiz tekrar; yine olmazsa yalnız o adım düşer |
| Bir adım başarısız | Diğer üç adım gösterilmeye devam eder, eksik sekme pasifleşir |
| Hız sınırı | Kalan adımlar denenmez, hazır örneklere yönlendirilir |

"Tekrar dene" yalnızca **düşen** adımları yeniden çağırır; başarılı adımların
sonucu korunur ve ödenmiş çağrılar yeniden ödenmez.

---

## Türkçe karakter tuzağı

`toUpperCase()` Türkçe'de bozuk çalışır: `i → I` olur, `İ` olmaz. Kitap
üretiminde bu hata 47 başlığı bozdu.

- Kodda büyütme yalnızca `lib/turkish.ts` üzerinden yapılır.
- `text-transform: uppercase` kullanan her yerde `lang="tr"` gerekir; bu
  `app/layout.tsx` içinde `<html lang="tr">` ile kökten sağlanır.

---

## Kapsam

**Girer:** tek soru girişi · dört çağrı · radyal harita · şerh paneli ·
Mîzân terazisi · önbellekli örnek
**Girmez:** kullanıcı hesabı · kaydetme · paylaşma · çoklu dil · ödeme

Çekirdek doğrulanmadan dallanma yok.

### Faz 2

Önbellek Supabase'e taşınacak; arayüz sözleşmesi (`getCached`) aynı kalır.
Hız sınırı bellek içi `Map` yerine Redis'e geçecek — mevcut hâli süreç
başınadır, birden çok sunucu örneğinde gerçek tavan örnek sayısıyla çarpılır.
