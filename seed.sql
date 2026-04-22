
-- VALO SEED DATA
TRUNCATE users, accounts, customers, system_settings CASCADE;

INSERT INTO users (full_name, username, password_hash, role) VALUES 
('Sistem Yaratıcısı', 'godmin', '$2b$10$0eLQU0Ppd6Mp11gjE8YL..kW3fwwpBj4vvbEs0rGyFOojaQ5SIPTC', 'MASTER_ADMIN'),
('Ahmet Yılmaz', 'yilmaz.ahmet', '$2b$10$0eLQU0Ppd6Mp11gjE8YL..kW3fwwpBj4vvbEs0rGyFOojaQ5SIPTC', 'ADMIN'),
('Zeynep Kaya', 'kaya.zeynep', '$2b$10$0eLQU0Ppd6Mp11gjE8YL..kW3fwwpBj4vvbEs0rGyFOojaQ5SIPTC', 'ADMIN'),
('Şule Çelik', 'celik.sule', '$2b$10$0eLQU0Ppd6Mp11gjE8YL..kW3fwwpBj4vvbEs0rGyFOojaQ5SIPTC', 'USER');

INSERT INTO accounts (account_name, currency_code) VALUES 
('Merkez Kasa TRY', 'TRY'),
('Merkez Kasa USD', 'USD'),
('Merkez Kasa EUR', 'EUR'),
('Merkez Kasa GBP', 'GBP');

INSERT INTO customers (full_name, identity_number, phone, country) VALUES 
('Hüseyin Al-Fayed', '99887766554', '+905321112233', 'Türkiye'),
('Elena Ivanova', '55443322110', '+79998887766', 'Rusya'),
('Mehmet Özdemir', '22334455667', '+905059998877', 'Türkiye');

INSERT INTO system_settings (key, value) VALUES 
('weather_config', '{"location": "Fatih"}'),
('printer_config', '{"header": "VALO TERMINAL", "footer": "Teşekkürler", "ip": "192.168.1.100", "port": 9100}'),
('global_spread', '300');

INSERT INTO exchange_rates (base_currency, target_currency, rate_multiplier) VALUES 
('USD', 'TRY', 321500),
('EUR', 'TRY', 345000),
('GBP', 'TRY', 402000);

