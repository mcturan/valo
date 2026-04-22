# VALO PROJESİ - v1.6 DENETİM & OTOMASYON PLANI

## 🟢 TAMAMLANANLAR (SABİT)
- [x] **Topology Arka Plan & Canlı Kurlar:** Dinamik terminal ruhu.
- [x] **KYC Sert Alarm:** 5000+ birim uyarısı ve Telegram tetiği.
- [x] **Kupür Giriş Sistemi:** Banknot dökümü modülü.
- [x] **Kasa Widget:** Personel nakit mevcudu takibi.
- [x] **Transaction Persistence:** İşlemlerin gerçekten DB'ye yazılması ve kasa güncelleme.
- [x] **Parity Engine:** USD/EUR gibi çapraz döviz hesaplama altyapısı.
- [x] **Printer Settings:** Ağ yazıcısı (IP/Port) ve fiş şablon yönetimi.
- [x] **Rate Settings:** Global kur makas (spread) ve dinamik kur senkronizasyonu.
- [x] **PDF Export:** İşlem ve müşteri listeleri için çıktı alma desteği.
- [x] **OCR Real Integration:** Pasaport/Kimlik görselinden veri ayrıştırma (Tesseract.js).
- [x] **AI Smurfing Detection:** Ollama/Risk motoru ile şüpheli işlem analizi.
- [x] **Cloud Sync:** TINC şifreli yedekleme (Simulation).
- [x] **Hardware Final:** WebSocket donanım verisi ile otomatik tutar eşleme.

## 🟡 ŞİMDİ YAPILIYOR (GAZA BASILDI - PROFESYONEL AUDIT)
- [ ] **Mobile Optimization:** Tablet/Mobil görünümlerin iyileştirilmesi.

## 🔴 ACİL YAPISAL REFAKTÖR (DENETİM SONRASI)
- [ ] **Decoupling index.ts:** "God File" yapısının Routes, Controllers ve Services olarak parçalanması.
- [ ] **Data Integrity Fix:** DB'deki `INTEGER` alanların `BIGINT`'e taşınması (Taşma riskine karşı).
- [ ] **Race Condition Patch:** `EXCHANGE_CLEARING` hesabının uygulama yerine DB katmanında (Seed/SQL) oluşturulması.
- [ ] **Security Hardening:** Koda gömülü JWT secret'ların kaldırılması ve gerçek `.env` yönetimi.
- [ ] **Middleware Enforcement:** Atıl durumdaki `validate` middleware'lerinin tüm finansal rotalara zorunlu kılınması.

## 🟡 PHASE 2: GERÇEK ENTEGRASYON (İLLÜZYONDAN GERÇEĞE)
- [ ] **Real Hardware Daemon:** Mock veriden kurtulup `serialport` ile fiziksel cihaz iletişimine geçiş.
- [ ] **True AI Risk Motor:** Basit `if` blokları yerine yerel Ollama/Llama3 modeline gerçek prompt akışı.
- [ ] **Full Sync Logic:** Simulation yerine TINC API ile hata toleranslı (Retries) senkronizasyon.
- [ ] **Vault Closure Logic:** `vault_sessions` tablosunu kapatan ve mutabakat sağlayan gerçek fonksiyonlar.

## 🟢 PHASE 3: PROFESYONEL ÇIKTI VE LOGLAMA
- [ ] **Thermal Printer Service:** Tarayıcıdan yazdırma yerine doğrudan TCP/IP üzerinden termal fiş basımı.
- [ ] **Advanced Audit Log:** Her işlemin detaylı JSON logunun (IP, User Agent, Time) tutulması.
- [ ] **Multi-Currency UI Fix:** Açılış ve transfer ekranlarının 4 ana birimi de (TRY, USD, EUR, GBP) desteklemesi.
