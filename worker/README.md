# LGS Takip — senkron servisi

Cloudflare Worker + KV. Tek bir "pano" saklar; şifre sunucuda doğrulanır.

## Uçlar

| Yöntem | Yol | Açıklama |
|---|---|---|
| `GET`  | `/health` | Servis ayakta mı |
| `POST` | `/login`  | `{ pin }` gövdesiyle şifre doğrular |
| `GET`  | `/data`   | `X-Pin` başlığıyla veriyi döner |
| `PUT`  | `/data`   | `X-Pin` başlığıyla veriyi yazar |

Yanlış şifre denemeleri IP başına saatte 20 ile sınırlıdır (KV sayacı).

## Kurulum

```bash
npx wrangler@3 login
npx wrangler@3 kv:namespace create LGS   # çıkan id'yi wrangler.toml'a yaz
npx wrangler@3 deploy
```

İlk şifre `INITIAL_PIN` değişkeninden (yoksa `050669`) alınır; uygulamadan
şifre değiştirilince KV'deki değer de güncellenir.
