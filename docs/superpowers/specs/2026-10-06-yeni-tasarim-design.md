# Yeni tasarım: pano düzeni, pembe tema

Kaynak: kullanıcının paylaştığı eğitim panosu görseli (mor çerçeve, sol simge menüsü,
büyük beyaz panel, "Hello, Arka 👋", ilerleme halkalı ders kartları, XP kartı, renkli
eylem kartları, "Learning activity" eğrisi). Düzen birebir alınır, renkler pembe tema.

## Kararlar

- **Renk:** çerçeve ve vurgu pembe-lila geçişi (#E05A93 → #B76BD6). Zemin beyaz panel,
  içindeki ikinci alan çok açık pembe (#FBF5F8). Eylem kartları doygun pastel: şeftali
  (#F6B04D), pembe-mor (#E07BE0), mint, mavi. Yazılar koyu mürdüm (#3B2537).
- **Yazı tipi:** "Plus Jakarta Sans" (görseldeki sade, modern yazı). Baloo 2 ve
  Quicksand kalkar. Büyük başlık "Merhaba, Ad 👋" kalın + ince karışık (görseldeki gibi).
- **Süsler:** uçuşan çiçek yaprakları kalkar (sade görünüm). Konfeti kalır.
- **Kilit / hoş geldin ekranları:** aynı renk ve yazıya geçer, düzenleri aynı kalır.

## Kabuk

- **Masaüstü (≥ 900px):** tüm sayfa pembe çerçeve. Solda 84px simge menüsü: üstte logo
  (🌸), ortada 7 sayfa simgesi (Bugün, Çizelge, Kitaplar, İngilizce, Rozetler,
  İstatistik, Denemeler), altta ⚙️ Ayarlar ve 🔒 Kilitle. Seçili simge beyaz yuvarlak
  zeminde. Üzerine gelince ad etiketi. Sağda 28px köşeli beyaz panel, içi kendi
  içinde kayar.
- **Panel üstü (her sayfa):** solda büyük sayfa başlığı ve altında bir satır açıklama
  (Bugün'de "Merhaba, Ad 👋" + motivasyon cümlesi), sağda 🔥 seri, ⏳ gün, ☁️, 🧺 sepet.
  Seviye çubuğu üst bardan kalkar, Bugün sayfasındaki XP kartına taşınır.
- **Telefon (< 900px):** çerçeve yalnız üstte ince pembe şerit; panel tam genişlik;
  gezinme bugünkü gibi alt sekme çubuğu (yeni görünümle). Ayarlar sağ üstte.

## Sayfalar

- **Bugün (görselin karşılığı):** iki sütun.
  - Sol: "Bugünün dersleri" kartları. Her ders: solda ders simgeli ilerleme halkası
    (bugünkü soru / hedefin ders payı), ad, doğru·yanlış·boş·çözdürdüğüm sayaçları
    (+/−), altta büyük yüzde/net.
  - Sağ üst: profil kartı (desenli pembe kapak, avatar 🌸, ad, "Sv. 8 · Deneme
    Şampiyonu", iki küçük kutu: bugün soru, seri) ve XP kartı (🏅, "1.380 XP",
    seviye çubuğu, "Rozetler" ve "Hediyeler" düğmeleri).
  - Sağ orta: iki renkli eylem kartı: şeftali "Deneme ekle" (Denemeler drawer'ını açar),
    pembe-mor "Hedefim" (bugünkü hedef halkası, kalan soru).
  - Sağ alt: "Çalışma etkinliği" yumuşak eğri grafiği, son 30 gün soru ve doğru
    eğrileri, üzerine gelince değer balonu.
  - Seri uyarısı panel başlığının altında ince şerit.
- **Diğer sayfalar:** aynı kart dili (beyaz kart, 22px köşe, ince gölge, renkli simge
  dairesi + başlık). Mevcut içerik ve işlevler korunur, yalnız görünüm değişir.
  - **İngilizce:** önceki öneri: özet şeridi + arama + "Kelime ekle", tür/durum çipleri,
    3 sütunlu kelime kartları, çoklu ekleme drawer'ı (satır satır EN/TR/tür tablosu,
    "listeden yapıştır" tabloyu doldurur, kayıtlı kelimeler işaretlenir).
  - Rozetler, İstatistik, Denemeler, Kitaplar, Çizelge, Hediyeler, Ayarlar: yeni renk,
    yazı ve kart başlığı; düzenleri büyük ölçüde aynı.

## Yapılmayacaklar

- Veri modeli, eşitleme, şifre ve oyun mantığı değişmez.
- Karanlık tema yok.

## Sıra

1. Kabuk: renk/yazı değişkenleri, sol menü, panel, panel başlığı, telefonda alt menü.
2. Bugün panosu.
3. İngilizce yenilemesi + çoklu ekleme.
4. Diğer sayfaların kart dili ve ince ayarlar.
Her adımda masaüstü ve telefon ekran görüntüsüyle kontrol; adım adım push.
