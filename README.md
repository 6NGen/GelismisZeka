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
cp .env.example .env.local     # ANTHROPIC_API_KEY değerini doldurun
npm run dev
```

`ANTHROPIC_API_KEY` **yalnız sunucuda** okunur; `/api/analyze` route'u dışında
hiçbir yere geçmez ve istemci paketine girmez. Anahtar tanımlı değilken de
uygulama açılır — önbellekli örnekler model çağrısı yapmadan çalışır.

| Değişken | Zorunlu | Varsayılan |
|---|---|---|
| `ANTHROPIC_API_KEY` | Canlı analiz için evet | — |
| `GZ_MODEL` | Hayır | `claude-sonnet-5` |

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
  prompts.ts            dört adımın prompt tanımları + çıktı sözleşmesi
  schema.ts             zod şemaları + TS tipleri
  steps.ts              adım sabitleri (zod'suz — istemci paketi için)
  anthropic.ts          API çağrısı, JSON ayıklama, tek tekrar
  cache.ts              önbellekli örnekler
  sanitize.ts           model çıktısının temizlenmesi
  rate-limit.ts         IP başına 20 istek/saat
  turkish.ts            toLocaleUpperCase("tr") sarmalayıcıları
data/cached/
  definecilik.json      elle yazılmış tam örnek
```

`lib/schema.ts` ile `lib/steps.ts` ayrımı bilinçlidir: bileşenlerin ihtiyaç
duyduğu çalışma-zamanı sabitleri zod'suz dosyada durur, böylece doğrulama
kitaplığı istemci paketine girmez.

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
hız sınırını uygular, modeli çağırır, cevabı zod ile doğrular, sanitize eder.
Şema tutmazsa **bir kez** sessizce tekrar dener; hız sınırı ve bağlantı
hatalarında tekrar denemez — beklemek çözüm değildir.

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
