TRUNCATE users CASCADE;
INSERT INTO users (id, full_name, username, password, role, nfc_enabled, is_active) VALUES 
(gen_random_uuid(), 'Sistem Yaratıcısı', 'godmin', '123', 'MASTER_ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Ahmet Yılmaz', 'yilmaz.ahmet', '123', 'ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Zeynep Kaya', 'kaya.zeynep', '123', 'ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Murat Demir', 'demir.murat', '123', 'ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Şule Çelik', 'celik.sule', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Can Yıldız', 'yilmaz.can', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Elif Şahin', 'sahin.elif', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Burak Aydın', 'aydin.burak', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Fatma Öz', 'oz.fatma', '123', 'USER', FALSE, TRUE);

TRUNCATE customers CASCADE;
INSERT INTO customers (id, full_name, identity_number, phone, company_name, country, address) VALUES 
(gen_random_uuid(), 'Hüseyin Al-Fayed', '99887766554', '+905321112233', 'Al-Fayed Import Export', 'Türkiye', 'Fatih, İstanbul'),
(gen_random_uuid(), 'Global Lojistik A.Ş.', '1122334455', '+902125554433', 'Global Lojistik', 'Türkiye', 'Maslak, İstanbul'),
(gen_random_uuid(), 'Elena Ivanova', '55443322110', '+79998887766', 'Ivanov Trading', 'Rusya', 'Moskova'),
(gen_random_uuid(), 'John Smith', '44556677889', '+447700900077', 'Smith & Co', 'İngiltere', 'Londra'),
(gen_random_uuid(), 'Mehmet Özdemir', '22334455667', '+905059998877', '', 'Türkiye', 'Kadıköy, İstanbul');

INSERT INTO accounts (id, account_name, currency_code) VALUES 
(gen_random_uuid(), 'Kasa TRY', 'TRY'),
(gen_random_uuid(), 'Kasa USD', 'USD'),
(gen_random_uuid(), 'Kasa EUR', 'EUR'),
(gen_random_uuid(), 'Kasa XAU', 'XAU') ON CONFLICT DO NOTHING;

DO $$
DECLARE
    u_id UUID; tx_id UUID;
    try_acc UUID; usd_acc UUID; eur_acc UUID; xau_acc UUID;
BEGIN
    SELECT id INTO u_id FROM users WHERE username = 'celik.sule' LIMIT 1;
    SELECT id INTO try_acc FROM accounts WHERE currency_code = 'TRY' LIMIT 1;
    SELECT id INTO usd_acc FROM accounts WHERE currency_code = 'USD' LIMIT 1;
    SELECT id INTO eur_acc FROM accounts WHERE currency_code = 'EUR' LIMIT 1;
    SELECT id INTO xau_acc FROM accounts WHERE currency_code = 'XAU' LIMIT 1;

    FOR i IN 1..5 LOOP
        INSERT INTO transactions (user_id, type, status, auth_used, created_at) VALUES (u_id, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', NOW() - (i || ' days')::interval) RETURNING id INTO tx_id;
        INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, usd_acc, 'CREDIT', 100000), (tx_id, try_acc, 'DEBIT', 3200000);
    END LOOP;
    
    FOR i IN 1..5 LOOP
        INSERT INTO transactions (user_id, type, status, auth_used, created_at) VALUES (u_id, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', NOW() - (i || ' hours')::interval) RETURNING id INTO tx_id;
        INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, eur_acc, 'CREDIT', 50000), (tx_id, try_acc, 'DEBIT', 1750000);
    END LOOP;

    FOR i IN 1..5 LOOP
        INSERT INTO transactions (user_id, type, status, auth_used, created_at) VALUES (u_id, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', NOW() - (i || ' weeks')::interval) RETURNING id INTO tx_id;
        INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, xau_acc, 'CREDIT', 10), (tx_id, try_acc, 'DEBIT', 2350000);
    END LOOP;
END $$;
