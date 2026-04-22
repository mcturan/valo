# 🗺️ VALO MİMARİ HARİTASI (MOC)

## 🏗️ Katmanlar (Layers)
- [[Backend_Structure]]: API Rotaları, Kontrolcüler ve Servisler.
- [[Database_Schema]]: Tablo ilişkileri ve WORM kuralları.
- [[UI_Architecture]]: Next.js bileşenleri ve Context yapısı.

## 🔗 Kritik Çapraz Bağlantılar (Cross-Links)
- **Finansal Akış:** [[transactionController]] ➡️ [[ledger_service]] ➡️ `ledger_entries` (DB)
- **Kasa Yönetimi:** [[vaultController]] ➡️ [[vault_sessions]] (DB) 🔄 [[Sidebar]] (UI)
- **Güvenlik:** [[auth_middleware]] ➡️ [[authController]] ➡️ `users` (DB)
- **Donanım:** [[hardware-daemon]] ➡️ [[HardwareContext]] (UI) ➡️ [[ExchangeCard]] (UI)

## 📂 Dosya Hiyerarşisi
- `src/index.ts`: Orkestra Şefi.
- `src/routes/`: Trafik Polisi.
- `src/controllers/`: İş Mantığı (Business Logic).
- `src/services/`: Ağır İşçiler (Ledger, Sync, AI).
- `src/repositories/`: Veri Erişim Katmanı (DAL).
