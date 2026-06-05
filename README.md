# Hukuk Bürosu İş Takibi

Büro içi LAN'da çalışan çoklu kullanıcılı iş takip uygulaması.

## Özellikler

- Mahkeme dosyası yönetimi (mahkeme adı, dosya no, müvekkil)
- Yapılacak işler, deadline, öncelik, durum takibi
- Aktivite geçmişi ve not ekleme
- Uygulama içi + tarayıcı hatırlatıcıları (SSE)
- Kullanıcı rolleri: Yönetici, Avukat, Sekreter
- SQLite yedekleme

## Kurulum (LAN)

```bash
npm install
cp .env.example .env
# SESSION_SECRET değiştir (min 32 karakter)

npm run db:migrate
npm run seed:admin
npm run dev
```

Varsayılan admin:
- E-posta: `admin@buro.local`
- Şifre: `Admin123!`

Özel admin için:
```bash
ADMIN_EMAIL=avukat@buro.local ADMIN_PASSWORD=GucluSifre123! npm run seed:admin
```

## Üretim

```bash
npm run build
npm start
```

Uygulama `0.0.0.0:3000` üzerinde dinler. Büro içindeki diğer bilgisayarlar:

```
http://SUNUCU_IP:3000
```

Firewall'da 3000 portunu aç.

## Yedekleme

```bash
npm run backup:db
```

Veya ayarlar sayfasından (yönetici) indir.

## Test

```bash
npm test
```

## Docker (opsiyonel)

```bash
SESSION_SECRET=uzun-gizli-anahtar docker compose up -d --build
```
