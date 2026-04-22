
-- VALO SEED DATA
TRUNCATE users, accounts, customers, system_settings CASCADE;

INSERT INTO users (full_name, username, password_hash, role) VALUES 
('Sistem Yaratıcısı', 'godmin', '$2b$10$ifJPquhniPoqKXgUKcvK5.TF4LrwtNApqB3LlIRTrw7NMU6Lhuh.i', 'MASTER_ADMIN'),
('Ahmet Yılmaz', 'yilmaz.ahmet', '$2b$10$ifJPquhniPoqKXgUKcvK5.TF4LrwtNApqB3LlIRTrw7NMU6Lhuh.i', 'ADMIN'),
('Zeynep Kaya', 'kaya.zeynep', '$2b$10$ifJPquhniPoqKXgUKcvK5.TF4LrwtNApqB3LlIRTrw7NMU6Lhuh.i', 'ADMIN'),
('Şule Çelik', 'celik.sule', '$2b$10$ifJPquhniPoqKXgUKcvK5.TF4LrwtNApqB3LlIRTrw7NMU6Lhuh.i', 'USER');

INSERT INTO accounts (account_name, currency_code, account_type) VALUES 
('Merkez Kasa TRY', 'TRY', 'MASTER'),
('Merkez Kasa USD', 'USD', 'MASTER'),
('Merkez Kasa EUR', 'EUR', 'MASTER'),
('Merkez Kasa GBP', 'GBP', 'MASTER');

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

INSERT INTO accounts (account_name, currency_code, account_type) VALUES
('EXCHANGE_CLEARING_TRY', 'TRY', 'CLEARING'),
('EXCHANGE_CLEARING_USD', 'USD', 'CLEARING'),
('EXCHANGE_CLEARING_EUR', 'EUR', 'CLEARING'),
('EXCHANGE_CLEARING_GBP', 'GBP', 'CLEARING')
ON CONFLICT DO NOTHING;
