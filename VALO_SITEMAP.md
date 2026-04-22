# VALO SİSTEM HARİTASI (SITE & ARCHITECTURE MAP)
v1.0 - Denetim Modu

## 🌍 BACKEND (VALO CORE API) - PORT 3030
### 🏗️ Yapısal Katmanlar
- `src/index.ts` (Giriş Noktası - *PARÇALANACAK*)
- `src/db.ts` (Connection Pool)
- `src/services/ledger.ts` (Finansal Çekirdek - *Surgical Precision*)
- `src/hardware-daemon.ts` (Donanım WebSocket - *Mock*)

### 🛣️ API Rotaları ve Bağlantılar
- `/login` ➡️ `users` (DB)
- `/transactions` ➡️ `customers`, `accounts`, `ledger_entries` (DB) 🔄 `ledger.ts`
- `/vault/*` ➡️ `vault_sessions`, `accounts` (DB)
- `/rates` ➡️ `exchange_rates` (DB)
- `/api/risk-analyze` ➡️ `ledger_entries` (30 günlük hacim analizi)
- `/api/ocr` ➡️ `Tesseract.js` entegrasyonu

## 🖥️ FRONTEND (UI TERMINAL) - PORT 3000
### 📄 Ana Sayfa (`pages/index.tsx`)
- **State Management:** `useValoAuth` (Kimlik), `useValoData` (Canlı Veri)
- **Context:** `HardwareContext` (WebSocket Dinleyici)

### 🧩 Bileşenler ve Görevleri
- `ExchangeCard` (Alım/Satım Arayüzü) ➡️ `KYCModal`, `DenomModal`
- `VaultPage` (Kasa Yönetimi) ➡️ `VaultOpeningModal`
- `ReportsPage` (İşlem Listesi) ➡️ `window.print()`
- `SettingsPage` (Sistem Ayarları) ➡️ *DÜZELTİLECEK (State Kaydı Eksik)*

## 🗄️ VERİTABANI (POSTGRESQL)
### 📊 Tablo İlişkileri
- `users` 1:N `vault_sessions`
- `users` 1:N `transactions`
- `customers` 1:N `transactions`
- `transactions` 1:N `ledger_entries`
- `accounts` 1:N `ledger_entries`

### 🛡️ Kısıtlamalar
- **WORM:** `prevent_modification` triggerları (Transactions & Ledger).
- **Double-Entry:** `ledger.ts` seviyesinde matematiksel denetim.
