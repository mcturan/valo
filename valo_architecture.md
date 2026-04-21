# VALO (Varlık Operasyonları / Vault & Exchange Operations) - Master Architecture Specification

## 1. SİSTEMİN AMACI VE KAPSAMI
VALO, transit ticaret şirketleri ve döviz büroları için özel olarak tasarlanmış, TINC (The Integration & Notification Core) ekosistemine entegre çalışan yüksek güvenlikli finansal operasyon terminalidir. Sistem; geleneksel muhasebe yazılımlarındaki veri bütünlüğü zafiyetlerini ortadan kaldırmayı, klavye kullanımını en aza indirmeyi ve donanım güdümlü (NFC ve Fitness Sorter) bir operasyon akışı yaratmayı amaçlar.

## 2. MİMARİ TOPOLOJİ (EDGE COMPUTING VE EVENT SOURCING)
Sistem, "Split-Brain" (Bölünmüş Beyin - iki farklı sunucuda aynı anda çelişen verilerin oluşması) felaketini matematiksel olarak imkansız kılmak için "Uç Bilişim (Edge Computing)" topolojisinde tasarlanmıştır.

### 2.1. Local Edge Server (Yerel Ana Sunucu)
* **Fiziksel Konum:** Operasyonun yapıldığı ofis içerisinde bulunan ana fiziksel makine.
* **Görev:** PostgreSQL veritabanını, yerel API servislerini, donanım dinleme arka plan servislerini (Daemon) ve (ileriki aşamada) Ollama yapay zeka modellerini barındırır.
* **Bağımsızlık:** Dış internet bağlantısı tamamen kopsa dahi, ofis içi tüm işlemler, cihaz iletişimleri ve veritabanı kayıtları %100 kapasite ile hatasız çalışmaya devam eder.

### 2.2. Thin Clients (Zayıf İstemciler / Gişe Mini PC'leri)
* **Donanım:** Gişelerde bulunan, düşük işlem gücüne sahip ekran terminalleri.
* **Görev:** Sadece Web UI (Kullanıcı Arayüzü) render eder. Üzerlerinde hiçbir iş mantığı (business logic) veya veritabanı bulunmaz.
* **Bağlantı:** Gişedeki NFC okuyucu ve Para Sayma Makinesinden (Fitness Sorter) gelen donanım sinyallerini Local Edge Server'a ileten bir köprü görevi görür.

### 2.3. TINC Event Bus (Bulut Senkronizasyonu)
* **Görev:** İnternet bağlantısı mevcut olduğunda, Local Edge Server'da gerçekleşen her `COMPLETED` statüsündeki finansal işlemi, TINC ana olay yoluna "Append-Only" (Sadece Ekle) bir olay paketi (Event Payload) olarak iletir.
* **Kurtarma:** İnternet kesintilerinde Local Edge Server paketleri kuyruğa alır. İnternet geri geldiğinde biriken paketler sırasıyla buluta itilir. Bulut sunucusu asla doğrudan işlem kabul etmez, sadece yerel sunucunun "Gölgesi"dir.

## 3. SİSTEMİN DEĞİŞMEZ KANUNLARI (CORE LAWS)
Sistemin veri bütünlüğü aşağıdaki 4 kanunla koruma altındadır. Bu kanunların ihlali sistem mimarisine aykırıdır.

### 3.1. Sıfır Kayan Nokta (Zero Floating-Point) Kuralı
* Tüm finansal değerler (para miktarları), ilgili para biriminin en küçük alt birimi (kuruş, cent vb.) cinsinden **INTEGER (Tam Sayı)** olarak saklanır. (Örnek: 153.45 USD sisteme `15345` olarak kaydedilir).
* Çapraz kur hesaplamalarında oluşan küsuratlar, her zaman bankacılık standartlarına (Round Half to Even - Banker Yuvarlaması) göre en yakın tam sayıya yuvarlanır. Veritabanında `float` veya `double` veri tipi kesinlikle kullanılamaz.

### 3.2. Çift Taraflı Kayıt (Double-Entry Bookkeeping)
* Hiçbir varlık veya kasa bakiyesi tek taraflı olarak arttırılamaz veya azaltılamaz.
* Oluşturulan her bir işlem (`transaction`), birbirini matematiksel olarak dengeleyen (Toplamı sıfır olan) en az iki adet `ledger_entry` (Defter kaydı) oluşturmak zorundadır. Bir kasadan değer çıkarken (Credit), diğer kasaya değer girmelidir (Debit).

### 3.3. WORM (Write Once, Read Many) ve İptal (Reversal) Mantığı
* Veritabanındaki `transactions` ve `ledger_entries` tablolarına atılan hiçbir kayıt **SİLİNEMEZ (DELETE)** veya tutarı **DEĞİŞTİRİLEMEZ (UPDATE)**.
* Personel hatalı bir işlem yaptığında, orijinal işlem olduğu gibi kalır. Sistem, orijinal işlemin matematiksel tam tersini (Değerleri eksi ile çarparak) içeren yeni bir `REVERSAL` statülü işlem oluşturur ve her iki işlemin ID'sini birbirine bağlar.

### 3.4. Harici Veri Kaynakları Kuralı (Web Scraping Yasağı)
* Döviz kurları hiçbir şart altında web sitelerinin HTML yapıları parse edilerek (Web Scraping) elde edilemez. Sadece resmi, belgelenmiş REST, GraphQL veya XML servisleri (TCMB, Fixer.io, Navasan API) kullanılır. API erişimi kesilirse, sistem manuel kur girişine veya en son saklanan başarılı kura dönüş yapar.

## 4. GÜVENLİK VE ROL TABANLI ERİŞİM KONTROLÜ (RBAC)
Sistem erişimi donanım anahtarları (NFC) üzerine kuruludur.

### 4.1. Roller
* **MASTER_ADMIN (Godmode):** Güvenlik zorunluluklarını açıp kapatabilen, global kar marjlarını değiştirebilen, API kaynaklarını yöneten ve sistemdeki her türlü işleme müdahale edebilen işletme sahibi rolü.
* **ADMIN (Yönetici):** Kasa durumlarını canlı izleyen, gün sonu/gün başı mutabakatlarını onaylayan, olağanüstü durumlarda personele "Geçiş İzni" veren operasyonel yönetici. Akıllı Kasa Optimizasyonu ve Arbitraj Fırsatları ekranlarına erişebilir.
* **USER (Gişe Personeli):** Sadece kendi vardiyasında aktif olan, donanım okutmaları ve kuralları belirlenmiş marjlar dahilinde döviz alım/satım işlemi yapabilen standart rol.

### 4.2. Donanımsal Yetkilendirme ve Override (Yetki Aşımı)
* **Standart Akış:** Gişe personeli, işlem ekranını açmak ve yapılan her işlemi onaylamak için sisteme tanımlı NFC kartını okutmak zorundadır.
* **NFC İstisnası (Override):** Personel kartını unutursa veya kart arızalanırsa işlem yapamaz. ADMIN veya MASTER_ADMIN, kendi şifresi veya NFC kartı ile o gişeye geçici bir oturum yetkisi tanımlar. Bu şekilde açılan tüm oturumlar ve yapılan işlemler veri tabanına `AUTH_OVERRIDE` bayrağı ile işaretlenir ve denetim raporlarında kırmızı uyarı ile gösterilir.

## 5. GELİŞMİŞ DONANIM VE YAPAY ZEKA MODÜLLERİ

### 5.1. Para Sayma Makinesi (Fitness Sorter) Entegrasyonu
* Sistem, RS232/TCP üzerinden para sayma makinesi ile sürekli konuşan bir Daemon içerir. Sayım bittiğinde, cihazın gönderdiği kupür dökümü (Örn: 20 adet 100 USD, 5 adet 50 USD) ve taranan banknot seri numaraları saniyeler içinde WebSocket üzerinden gişe ekranına yansır.
* Bu işlem manuel giriş hatalarını sıfırlar ve `banknote_inventory` tablosuna kesin kayıt oluşturur.

### 5.2. Gelecek Faz (Phase 2) Modülleri
* **Smurfing Tespit Motoru:** Belirli bir müşterinin yasal limitlere takılmamak için işlemleri günlere bölmesini tespit eden algoritmik uyarı sistemi.
* **Kupür (Denomination) Optimizasyonu:** Kasa içindeki bozuk/bütün para dengesini analiz edip, ödeme yapacak personele "100'lük banknotlar azalıyor, ödemeyi 50'liklerle yap" şeklinde akıllı uyarılar üreten modül.
* **Arbitraj Monitörü:** Farklı kur kaynakları (Örn: Navasan ile Uluslararası Kur) arasındaki anlık sapmaları hesaplayarak en karlı çapraz işlem paritesini bulup yöneticilere sinyal üreten modül.