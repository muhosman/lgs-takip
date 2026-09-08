# 🌸 LGS Takip Çizelgem

LGS'ye hazırlanan bir öğrenci için hazırlanmış, günlük soru takip ve motivasyon sitesi.
Sunucu, hesap ve kurulum gerektirmez — saf HTML/CSS/JS, veriler tarayıcıda saklanır.

## Neler var

- **Kilit ekranı** — 6 haneli şifre
- **Bugün** — günlük hedef halkası, 6 ders için doğru/yanlış/boş/sorulacak/çözdürdüğüm sayaçları
- **Çizelge** — haftalık ders × gün tablosu, otomatik toplamlar, haftalar arası gezinme
- **İstatistik** — 14 günlük trend, ders bazlı dağılım, doğruluk oranı, en zayıf ders analizi, 16 rozet
- **Denemeler** — deneme girişi, net ve tahmini LGS puanı (100–500), puan gelişim grafiği
- **Ayarlar** — isim, günlük hedef, sınav tarihi, şifre, JSON yedek al/yükle

Oyunlaştırma: XP + seviye sistemi, gün serisi (streak), rozetler ve hedef tamamlandığında konfeti.

## Çalıştırma

Statik site olduğu için herhangi bir sunucuyla açılır:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

> ES modülleri kullanıldığı için `index.html`'i dosya olarak (`file://`) açmak yerine
> bir HTTP sunucusu üzerinden açmak gerekir.

## Yapı

```
index.html          uygulama kabuğu (kilit, hoş geldin, sekmeler)
css/styles.css      pastel tema
js/data.js          dersler, metrikler, seviyeler, rozetler
js/utils.js         tarih, net ve puan hesapları
js/store.js         localStorage veri katmanı
js/gamify.js        XP, seviye, seri, rozet mantığı
js/charts.js        kütüphanesiz SVG grafikler
js/confetti.js      kutlama animasyonu
js/views/*.js       ekranlar
```

## Not

Şifre istemci tarafında tutulur; bu bir gizlilik önlemi değil, sadece meraklı gözlere karşı basit bir kapıdır.
