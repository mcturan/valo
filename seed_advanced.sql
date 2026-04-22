TRUNCATE transactions CASCADE;
TRUNCATE ledger_entries CASCADE;
TRUNCATE authorized_persons CASCADE;
TRUNCATE customers CASCADE;
TRUNCATE users CASCADE;

ALTER TABLE ledger_entries ALTER COLUMN amount TYPE BIGINT;
ALTER TABLE forward_contracts ALTER COLUMN locked_rate TYPE BIGINT, ALTER COLUMN total_amount TYPE BIGINT, ALTER COLUMN remaining_amount TYPE BIGINT;

INSERT INTO users (id, full_name, username, password, role, nfc_enabled, is_active) VALUES 
(gen_random_uuid(), 'Sistem Kurucusu', 'godmin', '123', 'MASTER_ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Ahmet Yılmaz', 'yilmaz.ahmet', '123', 'ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Zeynep Kaya', 'kaya.zeynep', '123', 'ADMIN', FALSE, TRUE),
(gen_random_uuid(), 'Şule Çelik', 'celik.sule', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Can Yıldız', 'yildiz.can', '123', 'USER', FALSE, TRUE),
(gen_random_uuid(), 'Elif Şahin', 'sahin.elif', '123', 'USER', FALSE, TRUE);

INSERT INTO customers (id, full_name, identity_number, phone, customer_type, company_name, tax_id, tax_office, country, address) VALUES 
(gen_random_uuid(), 'Hüseyin Al-Fayed', '99887766554', '+905321112233', 'CORPORATE', 'Al-Fayed Import Export', '1122334455', 'Fatih VD.', 'Türkiye', 'Fatih, İstanbul'),
(gen_random_uuid(), 'Elena Ivanova', '55443322110', '+79998887766', 'CORPORATE', 'Ivanov Trading', '9988776655', 'Maslak VD.', 'Rusya', 'Moskova / Şube: Şişli'),
(gen_random_uuid(), 'Mehmet Özdemir', '22334455667', '+905059998877', 'INDIVIDUAL', '', '', '', 'Türkiye', 'Kadıköy, İstanbul'),
(gen_random_uuid(), 'Ayşe Demir', '33445566778', '+905334445566', 'INDIVIDUAL', '', '', '', 'Türkiye', 'Beşiktaş, İstanbul'),
(gen_random_uuid(), 'Ali Veli', '44556677889', '+905445556677', 'INDIVIDUAL', '', '', '', 'Türkiye', 'Üsküdar, İstanbul');

DO $$
DECLARE
    comp1 UUID; comp2 UUID;
BEGIN
    SELECT id INTO comp1 FROM customers WHERE company_name = 'Al-Fayed Import Export' LIMIT 1;
    SELECT id INTO comp2 FROM customers WHERE company_name = 'Ivanov Trading' LIMIT 1;
    INSERT INTO authorized_persons (customer_id, full_name, identity_number, phone) VALUES 
    (comp1, 'HASAN BİN TARIQ', '11122233344', '+905321112233'),
    (comp1, 'ÖMER FARUK', '22233344455', '+905332223344'),
    (comp2, 'DIMITRI SOKOLOV', '33344455566', '+79990001122');
END $$;

DO $$
DECLARE
    user_sule UUID; user_can UUID;
    cust1 UUID; cust2 UUID; cust3 UUID;
    auth1 UUID;
    acc_try UUID; acc_usd UUID; acc_eur UUID;
    tx_id UUID;
    r_amount BIGINT; r_rate BIGINT;
    i INT; rand_date TIMESTAMP;
BEGIN
    SELECT id INTO user_sule FROM users WHERE username = 'celik.sule' LIMIT 1;
    SELECT id INTO user_can FROM users WHERE username = 'yildiz.can' LIMIT 1;
    SELECT id INTO cust1 FROM customers WHERE full_name = 'Mehmet Özdemir' LIMIT 1;
    SELECT id INTO cust2 FROM customers WHERE full_name = 'Ayşe Demir' LIMIT 1;
    SELECT id INTO cust3 FROM customers WHERE company_name = 'Al-Fayed Import Export' LIMIT 1;
    SELECT id INTO auth1 FROM authorized_persons WHERE full_name = 'HASAN BİN TARIQ' LIMIT 1;
    SELECT id INTO acc_try FROM accounts WHERE currency_code = 'TRY' LIMIT 1;
    SELECT id INTO acc_usd FROM accounts WHERE currency_code = 'USD' LIMIT 1;
    SELECT id INTO acc_eur FROM accounts WHERE currency_code = 'EUR' LIMIT 1;

    FOR i IN 1..50 LOOP
        rand_date := NOW() - (floor(random() * 30) || ' days')::interval - (floor(random() * 24) || ' hours')::interval;
        r_amount := floor(random() * 9900 + 100) * 100;
        
        IF i % 3 = 0 THEN
            r_rate := floor(random() * 500 + 320000); 
            INSERT INTO transactions (user_id, type, status, auth_used, created_at, banknote_serials) 
            VALUES (user_sule, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', rand_date, jsonb_build_object('customer_id', cust1)) RETURNING id INTO tx_id;
            INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, acc_usd, 'CREDIT', r_amount), (tx_id, acc_try, 'DEBIT', (r_amount * r_rate / 10000));
        ELSIF i % 3 = 1 THEN
            r_rate := floor(random() * 500 + 345000); 
            INSERT INTO transactions (user_id, type, status, auth_used, authorized_person_id, created_at, banknote_serials) 
            VALUES (user_can, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', auth1, rand_date, jsonb_build_object('customer_id', cust3)) RETURNING id INTO tx_id;
            INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, acc_eur, 'CREDIT', r_amount), (tx_id, acc_try, 'DEBIT', (r_amount * r_rate / 10000));
        ELSE
            r_rate := floor(random() * 500 + 325000); 
            INSERT INTO transactions (user_id, type, status, auth_used, created_at, banknote_serials) 
            VALUES (user_sule, 'EXCHANGE', 'COMPLETED', 'PASSWORD_OVERRIDE', rand_date, jsonb_build_object('customer_id', cust2)) RETURNING id INTO tx_id;
            INSERT INTO ledger_entries (transaction_id, account_id, entry_type, amount) VALUES (tx_id, acc_usd, 'DEBIT', r_amount), (tx_id, acc_try, 'CREDIT', (r_amount * r_rate / 10000));
        END IF;
    END LOOP;
END $$;
