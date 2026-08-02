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
| `GZ_DAILY_CALL_CAP` | Hayır | `200` |
| `GZ_RATE_LIMIT` | Hayır | `20` |
| `GZ_CACHE_TTL_HOURS` | Hayır | `24` |

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

### Kota koruması — dört katman

Bir analiz **4 model çağrısı** eder. Halka açık bir adreste ücretsiz katmanın
bir günde tükenmemesi için dört ayrı katman vardır; her biri farklı şeyi korur:

| Katman | Dosya | Neyi durdurur | Ömrü |
|---|---|---|---|
| **Kütüphane** | `lib/kutuphane.ts` | Hazır mevzuların hiç üretilmesini | Kalıcı |
| Sonuç önbelleği | `lib/result-cache.ts` | Aynı mevzunun tekrar sorulmasını | Süreç ömrü |
| Günlük çağrı tavanı | `lib/budget.ts` | **Toplam** tüketimi | Gün |
| IP başına hız sınırı | `lib/rate-limit.ts` | Tek ziyaretçinin aşırıya kaçmasını | Saat |

Arama ucuzdan pahalıya yapılır: kütüphane → çalışma-zamanı önbelleği → model.
İstemci de sunucu da kütüphaneye bakar; ikincisi, kota güvencesinin istemcinin
davranışına bağlı kalmaması içindir.

**Sonuç önbelleği** süreç belleğindedir: aynı mevzu ikinci kez sorulduğunda
model çağrısı sıfırdır, ama sunucu örneği yenilendiğinde tablo boşalır.
Anahtar `adım | küçük harfli mevzu`, ömrü varsayılan 24 saat.

**Günlük tavan** her model çağrısında artan bir sayaçtır — §7 tekrarı da
sayılır, çünkü sağlayıcı tarafında da sayılıyor. Dolduğunda uygulama çökmez:
`RATE` döner, kullanıcı hazır örneklere yönlendirilir, ertesi gün (UTC)
kendiliğinden yenilenir. Tavanı `0` yapmak canlı analizi tamamen kapatır.

**Hız sınırı ile tavanın farkı önemlidir:** yüz ayrı ziyaretçi hız sınırına
hiç takılmadan kotayı bitirebilir. Tavan tam olarak bunu keser.

### Dakikalık sınır: adımlar arasında bekleme

Ücretsiz katmanların günlük sınırının yanında bir de **dakikalık** sınırı
vardır. Dört çağrı saniyeler içinde arka arkaya giderse bu sınır tepiyor ve
analiz ortasında 429 alıyor. `app/page.tsx` bu yüzden adımlar arasına 2 saniye
koyar (`STEP_GAP_MS`): analiz ~13 saniye yerine ~19 saniye sürer, ama yarım
kalmaz. Bekleme yalnız adımların ARASINA girer; ilk adım beklemeden başlar ve
§7 tekrarı aynı adımın içinde olduğu için beklemez.

### Bu korumanın sınırı

Kütüphane dışındaki **üç katman süreç belleğindedir.** Sunucusuz ortamda her
örnek kendi sayacını ve kendi önbelleğini tutar; örnekler yenilendikçe ikisi de
sıfırlanır. Yani günlük tavan kotayı garanti etmez — tüketim hızını bilinen bir
kata indirir. Kesin garanti Faz 2'deki paylaşımlı sayaçla (Redis) gelir.

Kütüphane bu sınırın dışındadır: depoda durur, soğuk başlatmadan etkilenmez ve
büyüdükçe kalıcı olarak kota tüketimini düşürür. Kotaya bağımlılığı gerçekten
azaltan tek katman odur.

Sıkılaştırmak isteyen `GZ_DAILY_CALL_CAP` ve `GZ_RATE_LIMIT` değerlerini
düşürebilir; ikisi de ortam değişkenidir, kod değişikliği gerektirmez.

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

## Kütüphane

Kütüphane, önceden üretilmiş ve **elle gözden geçirilmiş** analizlerdir.
İki işi birden yapar ve ikincisi birincisinden önemlidir:

**1. Kota.** Kütüphanedeki bir mevzu hiç model çağrısı yapmaz — ne Vercel'de
ne de statik GitHub Pages'te. Trafiğin büyük kısmı aynı birkaç mevzuya gider;
onlar burada durursa kota yalnız **yeni** mevzular için harcanır. Kütüphane
büyüdükçe uygulamanın kotaya bağımlılığı azalır.

**2. Doğruluk.** Kütüphane içeriği kullanıcının önünde canlı üretilmez:
üretilir, dosya olarak yazılır, **insan okur**, sonra depoya girer. İlimler
arası bağların ve Arapça terimlerin sessizce yanlış olma riski ancak bu ara
adımla kesilebilir. Canlı üretimde böyle bir denetim imkânsızdır.

### Üretme — GitHub üzerinden (önerilen)

Anahtarın kimsenin makinesine inmemesi için üretim depoda çalışır.

1. **Settings → Secrets and variables → Actions → New repository secret**
   adıyla `GEMINI_API_KEY` eklenir. Anahtar yalnız buraya girilir.
2. **Actions → Kütüphane üret → Run workflow.**
3. İş akışı üretir, şemadan geçirir, derler ve **pull request açar.**

İş akışı üretimi doğrudan yayınlamaz. Kütüphanenin değeri o ara adımdadır:
PR'ın diff'i, içeriğin okunduğu ekrandır. Okumadan birleştirmeyin.

Beğenilmeyen bir mevzu için iş akışını o mevzu adıyla ve **"Var olanları da
baştan üret"** seçeneğiyle çalıştırın; ya da JSON'u elle düzeltin.

### Üretme — yerelde

```bash
# data/mevzular.json içine mevzuları yazın, sonra:
GEMINI_API_KEY=... npm run kutuphane

# tek bir mevzuu baştan üretmek için:
GEMINI_API_KEY=... npm run kutuphane -- --yenile "Faiz"

# elle düzeltilmiş dosyaları şemadan geçirmek için:
NODE_OPTIONS=--conditions=react-server npx tsx scripts/kutuphane-dogrula.mts
```

Betik uygulamanın **kendi kod yolunu** kullanır: aynı promptlar, aynı şema,
aynı içerik kuralları, aynı temizlik, aynı tek-tekrar. Ayrı bir üretim yolu
olsaydı kütüphanedeki içerik canlı üretilenden sessizce farklılaşırdı.

Var olan mevzu yeniden üretilmez; yarıda kesilen üretim tekrar çalıştırıldığında
kaldığı yerden sürer ve kota yanmaz. Kota sınırına gelinirse üretim durur,
o ana kadar üretilenler korunur.

`GZ_KUTUPHANE_ARALIK` (varsayılan 3000 ms) çağrılar arasındaki beklemedir;
sağlayıcının dakikalık sınırına yaklaşmamak için.

**Dakikalık kotaya takılırsa bekler, günlükte durur.** Toplu üretimde beklemek
doğru davranıştır: dakikalık sınır saniyeler içinde açılır ve iş zaten arka
planda çalışır. Canlı akışta aynı şeyi yapmak kullanıcıyı ekran başında
bekletirdi — bu yüzden bekleme orada değil, yalnız burada.

### Yükleme biçimi

| Ne | Nerede | Nasıl |
|---|---|---|
| Dizin (mevzu adı → dosya) | `data/kutuphane-index.json` | Paketlenir — birkaç bayt |
| Analizlerin gövdesi | `public/kutuphane/*.json` | İstendiğinde indirilir |

Bu ayrım şart: bir analiz ~10 KB. Hepsi paketlenseydi 200 mevzuluk bir
kütüphane istemci paketine 2 MB eklerdi. Şimdi kütüphane büyüdükçe paket
büyümüyor.

Statik dışa aktarımda site alt dizinde sunulduğu için (`/GelismisZeka`) ham
`fetch` önek ister; `NEXT_PUBLIC_GZ_BASE_PATH` bunu istemciye bildirir.
Sunucu tarafında gövdeler dosyadan okunur ve yol çalışma zamanında kurulduğu
için `outputFileTracingIncludes` ile sunucusuz pakete açıkça dâhil edilir.

**Kütüphane büyüdükçe statik sürüm gerçek bir ürüne dönüşür:** GitHub Pages'te
API anahtarı da uç nokta da yokken kütüphanedeki her mevzu tam olarak açılır.

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
  gorsel/               görsel anlatım bileşenleri (çizimi model değil kod yapar)
  SerhPanel.tsx         kelime → cümle → paragraf
  MizanBar.tsx          tez/karşı ağırlık çubuğu
lib/
  prompts.ts            dört modun prompt tanımları + çıktı sözleşmesi
  schema.ts             zod şemaları + TS tipleri
  modes.ts              mod sabitleri, mîzân hükmü (zod'suz — istemci paketi için)
  model.ts              API çağrısı, JSON ayıklama, tek tekrar
  budget.ts             günlük model çağrısı tavanı
  cache.ts              kütüphane arayüzü (sözleşme korunuyor)
  kutuphane.ts          kütüphane dizini + gövde indirme (istemci)
  kutuphane-server.ts   kütüphanenin sunucu tarafı karşılığı
  result-cache.ts       model sonuçlarının sunucu önbelleği
  sanitize.ts           model çıktısının temizlenmesi + safeRich
  rate-limit.ts         IP başına 20 istek/saat
  turkish.ts            toLocaleUpperCase("tr") sarmalayıcıları
data/
  kutuphane-index.json  mevzu adı → dosya adı (paketlenir)
  mevzular.json         üretilecek mevzu listesi
public/kutuphane/
  definecilik.json      elle yazılmış tam örnek
scripts/
  kutuphane.mts         kütüphane üreticisi
  kutuphane-dogrula.mts kütüphanedeki dosyaları şemadan geçirir
  build-static.mjs      GitHub Pages çıktısı
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
  name: string;      // dal adı — en fazla 5 kelime
  ar?: string;       // Arapça terim (emin değilse boş)
  ilim?: string;     // dalın ait olduğu ilim — yalnız konu düzeyi bağda dolar
  word: string;      // KELİME — anahtar terim, en fazla 2 kelime
  sentence: string;  // CÜMLE — tek cümle, ≤15 kelime
  para: string;      // PARAGRAF — 2-3 cümle, sınırlı <b>/<i>
  mizan?: { tez: number; karsi: number };  // 0-10
}
```

İstenen dal sayısı 4 / 4 / 5 / 3'tür; model sapabildiği için arayüz 3–6 arası
her sayıyı çizer.

### Kelime sınırları neden 1 değil 2

`word` başta "tek anahtar kelime", `name` "en fazla 4 kelime"ydi. Gerçek modelle
ilk canlı denemede iki adım tam bu iki kuraldan düştü. Sebep Türkçe: "besin
ögesi", "enerji dengesi", "hukukî statü" gibi terimler tek kelimeye sığmıyor;
zorlanınca model ya terimi bozuyor ya kuralı çiğniyor. Sınır 2 ve 5 oldu —
KELİME katmanının "tek çıpa" fikri korunur, terim bozulmaz.

Bu sayılar **iki yerde birlikte** durur: `lib/prompts.ts` içindeki sistem
promptunda (modele söylenen) ve `lib/schema.ts` içindeki denetimde (sunucuda
sayılan). Ayrılırlarsa model kendisine hiç söylenmemiş bir kuraldan düşer.

### Bağın çözünürlüğü merkezin mertebesine bağlıdır

Üçüncü soru (`bagli`) tek biçimli değildir. Merkezdeki mevzuun **mertebesi**
bağın hangi düzeyde kurulacağını belirler:

| Merkezde | Bağ neye kurulur | `ilim` alanı |
|---|---|---|
| Bir **ilim** (matematik, fıkıh, dilbilim) | O ilme bağlı **diğer ilimler** | boş — dalın kendisi ilimdir |
| Bir **konu/bölüm** (türev, icmâ, present perfect) | Diğer ilimlerdeki **karşılık gelen konular** | dolu — dal "hangi ilimde hangi konu" |

Mertebeyi model belirler ve `mertebe` alanına yazar; ayrı bir çağrı yapılmaz.
Sunucu, ilim mertebesinde `ilim` alanını temizler — orada dolu olması bilgiyi
iki kez göstermekten başka bir şey yapmaz.

**Neden önemli:** "Matematik" merkezdeyken çıkan harita (fizik, mantık,
ekonomi…) kimseye matematik öğretmez. "Türev" merkezdeyken çıkan harita
(*Fizikte hız ve ivme*, *Ekonomide marjinal maliyet*, *Biyolojide büyüme
oranı*) aynı kavramı beş ayrı ağa bağlar. Metodun kalıcılık ilkesi —
ne kadar çok ilimle bağ kurulursa bilgi o kadar kalıcı olur — tam burada
işler. Metot yukarıda tanıtır, aşağıda öğretir.

Konu düzeyi bağ döngü de kurar: "Türev"den "marjinal maliyet"e inip oradan
bakınca karşınıza yine matematik çıkar. Zincir bir ağaç değil, bir ağdır.

### Görsel anlatım — model çizmez, tarif eder

Harita başına en çok bir görsel gelir ve **yalnız gerektiğinde**; model gerek
görmezse harita metinle kalır.

| Tür | Nerede işe yarar |
|---|---|
| `zaman-cizgisi` | Sıra, dönem, zaman kipi. İki şerit karşılaştırma yapar |
| `sinir` | "Bu ne değildir" sorusunun doğal biçimi — ayrımın kendisi |
| `grafik` | Nicel ilişki, eğri, değişim |
| `surec` | Sıralı işleyiş (hukuk zinciri, biyolojik döngü) |
| `simulasyon` | Fiziksel hareket — eğik atış, serbest düşüş, sarkaç |

**Model çizim üretmez, çizim TARİFİ üretir.** Sabit bir türler sözlüğünden
birini seçip alanlarını doldurur; çizimin kendisi `components/gorsel/`
altındaki elle yazılmış bileşenlerdedir. Bu, `MizanBar`'ın genelleştirilmiş
hâlidir: model sayı ve etiket verir, nasıl gösterileceğine uygulama karar verir.

Model SVG ya da kod üretseydi iki şey birden kaybedilirdi: `<script>` taşıyan
SVG iki katmanlı HTML güvenliğini delerdi, üretilen çizimin kalitesi de
denetlenemezdi.

**Simülasyonda fizik modele bırakılmaz.** Model yalnız hangi olayın ve hangi
başlangıç değerlerinin gösterileceğini söyler; yörüngeyi, süreyi, menzili
`Simulasyon.tsx` kapalı formülle hesaplar. Gerekçe: bir şema, bir cümleden çok
daha fazla otorite taşır — öğrenci resme metinden çok inanır. Modelin
hesapladığı bir yörünge sessizce yanlış olabilir, kapalı formülünki olamaz.

Kullanıcı değerleri kaydırıcıyla değiştirebilir; simülasyonun öğrettiği şey tek
bir atış değil, açı ve hız değişince ne olduğudur.

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
hız sınırını uygular, sunucu önbelleğine bakar (isabet varsa model çağrısı
yapılmaz), günlük tavanı yoklar, modeli çağırır, cevabı zod ile doğrular, sanitize eder ve
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

Sağlayıcının 429'u tek bir durum değildir ve ikisi ayrı ayrı bildirilir:
**dakikalık** kota saniyeler içinde açılır (mesajda kaç saniye bekleneceği
yazar, `retry-after` başlığı da gönderilir), **günlük** kota ertesi güne kadar
kapalıdır ve beklemek çözmez. İkisine aynı cümleyi söylemek kullanıcıyı ya
boşuna bekletir ya boşuna vazgeçirir; ayrım `quotaId` alanından yapılır.

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
