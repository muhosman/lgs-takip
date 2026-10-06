# Hediyeler

Abla/abinin gerçek hediyeler koyduğu, belli bir başarıya ulaşınca açılan ödül adımları.

## Koşul türleri

| tür | ölçüt (en iyi değer, geri gitmez) |
|-----|-----------------------------------|
| `net` | en iyi deneme neti (`bestExamNet`) |
| `score` | en iyi tahmini LGS puanı (`bestExamScore`) |
| `level` | XP seviyesi (`levelInfo(xp).level`) |
| `questions` | toplam soru (`totalQ`) |
| `streak` | en uzun gün serisi (`bestStreak`) |

Açılmışlık saklanmaz, `summarize` çıktısından hesaplanır (`gamify.giftProgress`).

## Veri (store)

- `gifts: [{ id, name, kind, target, delivered, _t }]`, `deletedGifts: [id]`
- `openedGifts: { id: zaman }` kutusu açılan (adı görülen) hediyeler
- `seenGifts: { id: zaman }` "yeni hediye" bildirimi gösterilenler
- `giftPin` hediye düzenleme şifresi (ayar, `updatedAt` ile eşitlenir)
- Birleştirme: hediyeler kitaplar gibi id + `_t`; açılan/görülen haritaları birleşir,
  `resetAt` öncesi girdiler düşer. "Verileri sıfırla" hediye listesini korur,
  açılma/görülme durumunu temizler.

## Öğrenci tarafı (Rozetler sayfasının üstü)

- Kilitli: soluk kutu, yalnız koşul ve ilerleme (`58/70`). Hediyenin adı yok.
- Koşul sağlandı, açılmadı: sallanan kutu, "Açmak için dokun". Dokununca kutu
  büyüyüp kaybolur, konfeti, ad görünür (`openedGifts`'e yazılır).
- Açıldı: ad + "Teslim edildi ✓" ya da "Teslim bekliyor".
- Yeni koşul sağlanınca bir kez konfeti + "Yeni bir hediyen var" bildirimi.
  Açılmamış hediye varken alt menüde Rozet sekmesinde nokta.

## Yönetici tarafı (Ayarlar)

- "🎁 Hediyeler" kartı, ayrı hediye şifresiyle açılır (ilk açışta belirlenir).
- Ekle (ad, tür, hedef), sil, teslim edildi işaretle, şifre değiştir.
- Ayarlar sekmesinden çıkınca kilitlenir.
- Şifre yalnız meraklı gözlere karşı basit bir kapı; yedek dosyasında adlar görünür.
