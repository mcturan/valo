-- VALO SİSTEMİ POSTGRESQL ANA ŞEMASI - v2.0
-- Bu dosya sistemin finansal gerçekliğini temsil eder. 
-- Tüm tutarlar INTEGER olarak (en küçük birim) tutulur.
-- WORM (Write Once Read Many) prensibi uygulanmıştır.

-- ENUM TANIMLAMALARI
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'USER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED');
CREATE TYPE transaction_type AS ENUM ('EXCHANGE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER');
CREATE TYPE entry_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE rate_source AS ENUM ('TCMB', 'FIXER', 'NAVASAN', 'MANUAL');
CREATE TYPE auth_method AS ENUM ('NFC_STANDARD', 'PASSWORD_OVERRIDE', 'ADMIN_OVERRIDE');
CREATE TYPE customer_type AS ENUM ('INDIVIDUAL', 'CORPORATE');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- KULLANICILAR TABLOSU
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    nfc_card_id VARCHAR(255) UNIQUE,
    nfc_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MÜŞTERİLER TABLOSU
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    customer_type customer_type DEFAULT 'INDIVIDUAL',
    identity_number VARCHAR(20) UNIQUE, -- TC No / Passport No
    tax_id VARCHAR(50),
    tax_office VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    country VARCHAR(100) DEFAULT 'Türkiye',
    risk_level risk_level DEFAULT 'LOW',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- YETKİLİ KİŞİLER (KURUMSAL MÜŞTERİLER İÇİN)
CREATE TABLE authorized_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    identity_number VARCHAR(20),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KASALAR (HESAPLAR) TABLOSU
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(3) NOT NULL, -- Örn: 'USD', 'TRY', 'EUR'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_account_name UNIQUE (account_name)
);

-- TARİHSEL KUR DEFTERİ (Hiçbir satır silinemez/değiştirilemez)
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate_multiplier INTEGER NOT NULL, -- Gerçek kur * 10000
    source rate_source NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İŞLEMLER (TRANSACTIONS) ANA KİMLİĞİ
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    applied_exchange_rate_id UUID REFERENCES exchange_rates(id),
    auth_used auth_method NOT NULL,
    banknote_serials JSONB, -- Banknot seri numaraları ve dökümü
    original_transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEFTER-İ KEBİR (LEDGER ENTRIES)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) NOT NULL,
    account_id UUID REFERENCES accounts(id) NOT NULL,
    entry_type entry_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), 
    currency_code VARCHAR(3) NOT NULL, -- İşlemin yapıldığı para birimi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SİSTEM AYARLARI
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ALARM KURALLARI
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair VARCHAR(20),
    condition_type VARCHAR(50),
    threshold_val NUMERIC,
    telegram_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GÜVENLİK TETİKLEYİCİSİ (TRIGGER) - WORM KURALI
CREATE OR REPLACE FUNCTION prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'WORM Kuralı İhlali: Finansal kayıtlar değiştirilemez veya silinemez.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_worm_transactions
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER enforce_worm_ledger
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();
