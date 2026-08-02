Kütüphane üreticisi çalıştı. Bu PR **incelenmeden birleştirilmemelidir.**

Kütüphanenin iki işinden ikincisi tam olarak burada yapılır: üretilen içerik
kullanıcının önüne çıkmadan önce insan tarafından okunur. Canlı üretimde böyle
bir kapı yoktur; olan tek kapı budur.

### Okurken bakılacaklar

- [ ] Tanımlar doğru mu (`nedir` haritaları)
- [ ] Sınırlar doğru çizilmiş mi (`nedegildir`)
- [ ] `ar` alanındaki Arapça terimler doğru mu — yanlış terim doğrudan ekranda görünür
- [ ] `bagli` haritasındaki bağlar **gerçek mi**, yoksa makul görünen uydurma mı
- [ ] Mîzân gerçekten çürütüyor mu, yoksa dişsiz bir denge mi kuruyor
- [ ] Hassas alanlarda (fıkıh, tıp, hukuk) hüküm veren bir dil var mı
- [ ] Görsel geldiyse doğru mu — şema bir cümleden daha inandırıcıdır

### Beğenilmeyen bir mevzu için

Actions → **Kütüphane üret** → o mevzuyu yazıp **Var olanları da baştan üret**
seçeneğiyle çalıştırın. Ya da JSON'u doğrudan elle düzeltin; dosyalar okunabilir
biçimdedir ve elle yazılmış `definecilik.json` ile aynı yapıdadır.

### Birleştirdikten sonra

Bu mevzular bir daha **hiç** model çağrısı yakmaz — ne Vercel'de ne GitHub
Pages'te. Kütüphane, kotaya bağımlılığı kalıcı olarak azaltan tek katmandır.
