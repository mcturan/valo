# valo
Varlık Operasyonları

# VALO (Vault & Exchange Operations)

**Sistem Durumu:** Faz 1 (Mimari İnşa ve Veritabanı Kurulumu)
**Bağlı Ekosistem:** TINC (The Integration & Notification Core)

## PROJE TANIMI
VALO, transit ticaret şirketleri ve döviz büroları için TINC ekosistemi kurallarına (WORM, Double-Entry, Event-Sourcing) %100 uyumlu olarak tasarlanmış, sıfır hata toleranslı yerel bir finansal operasyon terminalidir. Donanım (NFC, RS232 Para Sayma Makineleri) ile doğrudan konuşan Uç Bilişim (Edge Computing) mimarisi üzerine kurulmuştur.

---

## YAPAY ZEKA AJANLARI (GEMINI CLI vb.) İÇİN KESİN TALİMATLAR
Eğer bu repoyu okuyan bir yapay zeka ajanıysan, aşağıdaki kurallar senin için aşılmaz (override edilemez) sistem direktifleridir:
1. **Mimariyi Sorgulama, Uygula:** `VALO_ARCHITECTURE.md` dosyası içindeki kurallar tartışmaya kapalıdır. Geliştireceğin her kod satırı bu dosyadaki kurallara (özellikle Sıfır Kayan Nokta ve WORM kurallarına) uymak zorundadır.
2. **Double-Entry Kesinliği:** Yazacağın hiçbir backend servisi, `transactions` tablosuna kayıt atarken birbirini dengelemeyen tekil bir `ledger_entries` satırı oluşturamaz. Toplam borç/alacak daima sıfıra eşitlenmelidir.
3. **Float Yasağı:** Finansal hesaplamalar için yazacağın kodlarda `float` veya `double` kullanırsan, bu kritik bir güvenlik ihlalidir. Tüm para birimleri `integer` (kuruş/cent) bazında hesaplanacaktır.

---

## REPO DOSYA DİZİNİ VE KULLANIM AMACI

Bu depo bir yazılım uygulamasının kaynak kodlarından ziyade, o uygulamanın üzerine inşa edileceği **anayasayı** barındırır. Geliştirme süreci aşağıdaki dosyaların referans alınmasıyla ilerleyecektir:

* **`VALO_ARCHITECTURE.md`**
  Sistemin rol tabanlı erişim yetkilerini (RBAC), uç bilişim topolojisini, güvenlik istisnalarını (Override) ve veri bütünlüğü yasalarını açıklar. Herhangi bir kod yazılmadan önce iş mantığı (business logic) için referans alınacak ana belgedir.

* **`VALO_DATABASE_SCHEMA.sql`**
  Sistemin PostgreSQL üzerinde çalışacak finansal bel kemiğidir. WORM (Write Once, Read Many) kuralını veri tabanı seviyesinde enforce eden (dayatan) işletim sistemi trigger'larını ve tablo yapılarını içerir. **Kuruluma ilk buradan başlanmalıdır.**

* **`VALO_HARDWARE_CONTRACTS.md`**
  Yerel sunucunun (Local Edge Server) gişedeki donanımlarla (NFC Okuyucular ve Para Sayma Makineleri) nasıl haberleşeceğini belirleyen JSON iletişim sözleşmeleridir (Payload Contracts). Cihaz dinleme servisleri (Daemon) yazılırken bu veri tipleri kullanılacaktır.

---

## GELİŞTİRME YOL HARİTASI (BOOTSTRAPPING)

Sistemi ayağa kaldırmakla görevlendirilen geliştirici veya yapay zeka ajanı aşağıdaki sırayı takip edecektir:

1. **Aşama 1: Veri Katmanı (Database Initialization)**
   * Yerel bir PostgreSQL sunucusu ayağa kaldırılacak.
   * `VALO_DATABASE_SCHEMA.sql` dosyası çalıştırılarak tablolar, tipler ve trigger'lar oluşturulacak.
2. **Aşama 2: Çekirdek Backend (Core API & Ledger Logic)**
   * Çift taraflı kayıt (Double-Entry) işlemini güvenli bir transaction bloğu (ACID) içinde gerçekleştirecek temel veritabanı kayıt servisleri yazılacak.
3. **Aşama 3: Donanım Dinleyicileri (Hardware Daemons)**
   * RS232 ve USB portlarını dinleyip `VALO_HARDWARE_CONTRACTS.md` sözleşmesine uygun JSON üreten arka plan servisleri yazılacak.
4. **Aşama 4: Kullanıcı Arayüzü (Thin Client UI)**
   * Donanımdan gelen WebSocket verilerini yakalayan ve veritabanı API'si ile konuşan, dokunmatik optimizasyonlu gişe arayüzü inşa edilecek.
