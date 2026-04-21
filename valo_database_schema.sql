-- VALO SİSTEMİ POSTGRESQL ANA ŞEMASI
-- Bu dosya sistemin finansal gerçekliğini temsil eder. Tüm tutarlar INTEGER olarak (en küçük birim) tutulur.

-- ENUM TANIMLAMALARI
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'USER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED');
CREATE TYPE transaction_type AS ENUM ('EXCHANGE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER');
CREATE TYPE entry_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE rate_source AS ENUM ('TCMB', 'FIXER', 'NAVASAN', 'MANUAL');
CREATE TYPE auth_method AS ENUM ('NFC_STANDARD', 'PASSWORD_OVERRIDE', 'ADMIN_OVERRIDE');

-- KULLANICILAR TABLOSU
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    nfc_card_id VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KASALAR (HESAPLAR) TABLOSU
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(3) NOT NULL, -- Örn: 'USD', 'TRY', 'EUR', 'IRR'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_account_name UNIQUE (account_name)
);

-- TARİHSEL KUR DEFTERİ (Hiçbir satır silinemez/değiştirilemez)
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate_multiplier INTEGER NOT NULL, -- Sıfır Float Kuralı: Gerçek kur * 10000 (Örn: 32.15 -> 321500)
    source rate_source NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İŞLEMLER (TRANSACTIONS) ANA KİMLİĞİ
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    customer_identity_hash VARCHAR(255), -- KYC için Kimlik/Pasaport hash verisi
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    applied_exchange_rate_id UUID REFERENCES exchange_rates(id),
    auth_used auth_method NOT NULL,
    original_transaction_id UUID REFERENCES transactions(id), -- Eğer bu bir REVERSAL işlemi ise orijinali işaret eder
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEFTER-İ KEBİR (LEDGER ENTRIES) - Finansal Hareketler
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) NOT NULL,
    account_id UUID REFERENCES accounts(id) NOT NULL,
    entry_type entry_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), -- Kuruş/Cent cinsinden her zaman pozitif INTEGER
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FİZİKSEL BANKNOT ENVANTERİ (OCR ve Fitness Sorter Verisi)
CREATE TABLE banknote_inventory (
    serial_number VARCHAR(100) PRIMARY KEY,
    currency_code VARCHAR(3) NOT NULL,
    denomination INTEGER NOT NULL, -- Örn: 100, 50, 20
    current_account_id UUID REFERENCES accounts(id), -- Şu an hangi kasada (Müşteriye verildiyse NULL)
    last_transaction_id UUID REFERENCES transactions(id) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GÜVENLİK TETİKLEYİCİSİ (TRIGGER) - WORM KURALI İHLALİNİ ENGELLER
-- transactions ve ledger_entries tablolarında UPDATE ve DELETE işlemlerini işletim sistemi seviyesinde kilitler.
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'WORM Kuralı İhlali: Finansal kayıtlar değiştirilemez veya silinemez. İptal işlemi için REVERSAL kaydı oluşturun.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_worm_transactions
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_worm_ledger
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();