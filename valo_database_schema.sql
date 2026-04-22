-- VALO SİSTEMİ POSTGRESQL ANA ŞEMASI - v2.1
-- WORM (Write Once Read Many) prensibi uygulanmıştır.

-- ENUM TANIMLAMALARI
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'USER');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'REVERSED', 'FAILED');
CREATE TYPE transaction_type AS ENUM ('EXCHANGE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'VAULT_TRANSFER');
CREATE TYPE entry_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE rate_source AS ENUM ('TCMB', 'FIXER', 'NAVASAN', 'MANUAL');
CREATE TYPE auth_method AS ENUM ('NFC_STANDARD', 'PASSWORD_OVERRIDE', 'ADMIN_OVERRIDE');
CREATE TYPE customer_type AS ENUM ('INDIVIDUAL', 'CORPORATE');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE vault_type AS ENUM ('MASTER', 'PERSONAL', 'CLEARING');
CREATE TYPE session_status AS ENUM ('OPEN', 'CLOSED');

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

-- KASALAR (HESAPLAR) TABLOSU
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(255) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    account_type vault_type DEFAULT 'PERSONAL',
    user_id UUID REFERENCES users(id), -- Personal vault ise ilgili kullanıcı
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_account_per_user_currency UNIQUE (user_id, currency_code, account_type)
);

-- KASA SEANSLARI (Günlük Açılış/Kapanış)
CREATE TABLE vault_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    status session_status DEFAULT 'OPEN',
    opening_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closing_time TIMESTAMP WITH TIME ZONE,
    opening_balances JSONB, -- Operatörün beyan ettiği açılış tutarları
    closing_balances JSONB, -- Operatörün beyan ettiği kapanış tutarları
    system_balances JSONB   -- Kapanış anında sistemde olması gereken tutarlar
);

-- MÜŞTERİLER TABLOSU
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    customer_type customer_type DEFAULT 'INDIVIDUAL',
    identity_number VARCHAR(20) UNIQUE,
    phone VARCHAR(50),
    country VARCHAR(100) DEFAULT 'Türkiye',
    risk_level risk_level DEFAULT 'LOW',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TARİHSEL KUR DEFTERİ
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate_multiplier INTEGER NOT NULL,
    source rate_source NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İŞLEMLER (TRANSACTIONS)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    applied_exchange_rate_id UUID REFERENCES exchange_rates(id),
    auth_used auth_method NOT NULL,
    banknote_serials JSONB,
    original_transaction_id UUID REFERENCES transactions(id),
    is_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEFTER-İ KEBİR (LEDGER ENTRIES)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) NOT NULL,
    account_id UUID REFERENCES accounts(id) NOT NULL,
    entry_type entry_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), 
    currency_code VARCHAR(3) NOT NULL,
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
