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

## Öğrenci tarafı

- Sağ üstte 🧺 sepet düğmesi: kazanılan hediye sayısı. Açılmayı bekleyen kutu varsa
  sallanır ve noktası yanar. Hiç hediye yoksa gizli.
- Sepete basınca "Hediyelerim" sayfası (alt menüde değil): özet (`3/12 hediye`) ve iki sekme.
  - 🧺 Sepetim: kazanılanlar. Açılmamışlar sallanan kutu, dokununca büyüyüp kaybolur,
    konfeti, ad görünür (`openedGifts`). Açılmışlarda ad + teslim durumu.
  - 🎯 Kazanılacak Hediyeler: koşul, ilerleme ve kalan (`33 puan kaldı`), en yakın üstte.
    Hediyenin adı gizli. Seri türünde ilerleme bugünkü seriden gösterilir.
  - Açılmayı bekleyen kutu varsa Sepetim, yoksa Kazanılacak sekmesiyle açılır.
- Yeni koşul sağlanınca bir kez konfeti + "Sepetine bir hediye düştü" bildirimi.

## Yönetici tarafı (Ayarlar)

- "🎁 Hediyeler" kartı, ayrı hediye şifresiyle açılır (ilk açışta belirlenir).
- Ekle (ad, tür, hedef), sil, teslim edildi işaretle, şifre değiştir.
- Ayarlar sekmesinden çıkınca kilitlenir.
- Şifre yalnız meraklı gözlere karşı basit bir kapı; yedek dosyasında adlar görünür.
