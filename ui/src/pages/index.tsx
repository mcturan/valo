import React, { useState, useEffect } from 'react';
import NetworkBackground from '../components/NetworkBackground';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import ExchangeCard from '../components/exchange/ExchangeCard';
import KYCModal from '../components/exchange/KYCModal';
import VaultOpeningModal from '../components/vault/VaultOpeningModal';
import DenomModal from '../components/vault/DenomModal';

// Pages
import VaultPage from '../components/vault/VaultPage';
import ReportsPage from '../components/reports/ReportsPage';
import CustomersPage from '../components/customers/CustomersPage';
import SettingsPage from '../components/settings/SettingsPage';

import { useValoAuth } from '../hooks/useValoAuth';
import { useValoData } from '../hooks/useValoData';
import { useHardware } from '../context/HardwareContext';
import { Customer } from '../types';

export default function ValoTerminal() {
  const { user, login, logout, authFetch, API_BASE } = useValoAuth();
  const { 
    liveRates, transactions, customers, balances, users, alarms, 
    loadData 
  } = useValoData(user, authFetch);
  
  const { lastEvent } = useHardware();

  const [view, setView] = useState<'EXCHANGE'|'REPORTS'|'CUSTOMERS'|'SETTINGS'|'VAULT'>('EXCHANGE');
  const [settingsTab, setSettingsTab] = useState<'GENERAL'|'PRINTER'|'RATES'|'USERS'|'ALARMS'>('GENERAL');
  
  const [time, setTime] = useState('');
  const [weather, setWeather] = useState({ current: '...', today: '...' });
  const [vaultStatus, setVaultStatus] = useState<{isOpen: boolean, session: any} | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('TRY');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [riskInfo, setRiskInfo] = useState<{risk_level: string, reason: string} | null>(null);

  const [printerConfig, setPrinterConfig] = useState({ header: 'VALO EXCHANGE DÖVİZ', footer: 'Bizi tercih ettiğiniz için teşekkürler.', paperWidth: '80mm', ip: '192.168.1.100', port: '9100' });
  const [rateSpread, setRateSpread] = useState(300);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('tr-TR')), 1000);
    fetch(`${API_BASE}/system/weather`).then(r => r.json()).then(setWeather).catch(() => {});
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user) checkVault();
  }, [user]);

  useEffect(() => {
    if (selectedCustomer) {
       authFetch('/api/risk-analyze', { 
         method:'POST', body: JSON.stringify({ customer_id: selectedCustomer.id }) 
       }).then(r => r.json()).then(setRiskInfo).catch(() => {});
    } else {
       setRiskInfo(null);
    }
  }, [selectedCustomer]);

  const checkVault = async () => {
    const res = await authFetch('/vault/status');
    if (res.ok) {
       const status = await res.json();
       setVaultStatus(status);
       if (!status.isOpen) setShowVaultModal(true);
    }
  };

  const getRawResult = () => {
    const amt = Number(amount);
    if (!amt) return 0;
    const baseToTry = baseCurrency === 'TRY' ? 10000 : (liveRates.find(r => r.pair.startsWith(baseCurrency))?.buy || 0);
    const targetToTry = targetCurrency === 'TRY' ? 10000 : (liveRates.find(r => r.pair.startsWith(targetCurrency))?.sell || 1);
    return (amt * baseToTry) / targetToTry;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleConfirm = async () => {
    if (!user) return;
    const payload = {
      customer_id: selectedCustomer?.id || null,
      debit_amount: Math.round(Number(amount) * 100),
      currency: baseCurrency,
      credit_amount: Math.round(getRawResult() * 100),
      credit_currency: targetCurrency
    };

    try {
      const res = await authFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) });
      if(res.ok) {
         alert("İŞLEM KAYDEDİLDİ. FİŞ YAZDIRILIYOR...");
         setShowDenomModal(false); setAmount(''); setSelectedCustomer(null);
         loadData();
      } else {
         const err = await res.json().catch(() => ({error: 'Sunucu hatası'}));
         alert("HATA: " + (err.error || 'Bilinmeyen hata'));
      }
    } catch (e) { alert("VERİTABANI BAĞLANTI HATASI!"); }
  };

  if (!user) {
    return (
      <div className="login-screen">
         <NetworkBackground />
         <form className="login-box" onSubmit={async (e) => {
            e.preventDefault();
            const username = (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value;
            const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
            const success = await login(username, password);
            if (!success) alert('Yetkisiz Giriş!');
         }}>
            <h1>VALO</h1>
            <p>COMMAND_CENTER_AUTH</p>
            <input name="username" placeholder="OPERATÖR ID" required />
            <input name="password" type="password" placeholder="ŞİFRE" required />
            <button type="submit">SİSTEME BAĞLAN</button>
         </form>
         <style>{`
          .login-screen { height:100vh; display:flex; align-items:center; justify-content:center; }
          .login-box { background:rgba(15,23,42,0.8); padding:60px; border-radius:32px; border:1px solid #334155; width:450px; text-align:center; backdrop-filter:blur(20px); z-index:10; }
          .login-box h1 { font-size:4rem; margin:0; color:#fbbf24; letter-spacing:10px; }
          .login-box p { color:#64748b; letter-spacing:2px; font-weight:900; font-size:0.7rem; margin-bottom:40px; }
          .login-box input { width:100%; padding:18px; margin-bottom:15px; background:#020617; border:1px solid #334155; border-radius:12px; color:white; font-weight:700; text-align:center; font-size:1rem; }
          .login-box button { width:100%; padding:20px; background:#fbbf24; color:black; font-weight:900; border:none; border-radius:12px; cursor:pointer; font-size:1.1rem; }
         `}</style>
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'EXCHANGE':
        return (
          <ExchangeCard 
            selectedCustomer={selectedCustomer}
            setShowKYCModal={setShowKYCModal}
            amount={amount}
            setAmount={setAmount}
            baseCurrency={baseCurrency}
            setBaseCurrency={setBaseCurrency}
            targetCurrency={targetCurrency}
            setTargetCurrency={setTargetCurrency}
            riskInfo={riskInfo}
            formatCurrency={formatCurrency}
            getRawResult={getRawResult}
            setShowDenomModal={setShowDenomModal}
          />
        );
      case 'VAULT':
        return (
          <VaultPage 
            vaultStatus={vaultStatus}
            balances={balances}
            onTransfer={async (p) => {
              const res = await authFetch('/vault/transfer', { method:'POST', body: JSON.stringify(p) });
              if(res.ok) { alert('Transfer Başarılı'); loadData(); }
            }}
            onCloseDay={() => alert('Kasa Kapanışı ve Ana Kasa Devri Yapıldı.')}
          />
        );
      case 'REPORTS':
        return <ReportsPage transactions={transactions} />;
      case 'CUSTOMERS':
        return <CustomersPage customers={customers} onNewCustomer={() => setShowKYCModal(true)} />;
      case 'SETTINGS':
        return (
          <SettingsPage 
            settingsTab={settingsTab}
            setSettingsTab={setSettingsTab}
            users={users}
            alarms={alarms}
            printerConfig={printerConfig}
            setPrinterConfig={setPrinterConfig}
            rateSpread={rateSpread}
            setRateSpread={setRateSpread}
            onSavePrinter={async () => {
              const res = await authFetch('/system/settings', {
                method: 'POST',
                body: JSON.stringify({ key: 'printer_config', value: printerConfig })
              });
              alert(res.ok ? 'Yazıcı ayarları kaydedildi.' : 'Yazıcı ayarları kaydedilemedi.');
            }}
            onSaveSpread={async () => {
              const res = await authFetch('/system/settings', {
                method: 'POST',
                body: JSON.stringify({ key: 'global_spread', value: rateSpread })
              });
              alert(res.ok ? 'Kur makası kaydedildi.' : 'Kur ayarları kaydedilemedi.');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <NetworkBackground />
      <Header 
        user={user} 
        weather={weather} 
        time={time} 
        view={view} 
        setView={setView} 
        onLogout={logout} 
      />

      <div className="body">
         <Sidebar balances={balances} liveRates={liveRates} />
         <main className="content">
            {renderContent()}
         </main>
      </div>

      {showDenomModal && <DenomModal amount={amount} baseCurrency={baseCurrency} onConfirm={handleConfirm} />}

      {showKYCModal && (
        <KYCModal 
          customers={customers} 
          onClose={()=>setShowKYCModal(false)} 
          onSelect={(c)=>{setSelectedCustomer(c); setShowKYCModal(false)}}
          onOCR={async (file) => {
            const reader = new FileReader();
            reader.onload = async () => {
               const res = await authFetch('/api/ocr', { method:'POST', body: JSON.stringify({image: reader.result}) });
               if(res.ok) {
                  const data = await res.json();
                  alert(`Ayrıştırıldı: ${data.full_name}`);
               }
            };
            reader.readAsDataURL(file);
          }}
          onRegister={async (payload) => {
            const res = await authFetch('/customers', { method:'POST', body:JSON.stringify(payload) });
            if(res.ok) { loadData(); alert("Müşteri Kaydedildi."); }
          }}
        />
      )}

      {showVaultModal && (
        <VaultOpeningModal onOpen={async (b) => {
          const res = await authFetch('/vault/open', { method:'POST', body: JSON.stringify({ opening_balances: b }) });
          if(res.ok) { setShowVaultModal(false); checkVault(); loadData(); }
        }} />
      )}
    </div>
  );
}
