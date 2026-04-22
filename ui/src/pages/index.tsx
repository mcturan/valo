import React, { useState, useEffect, useMemo } from 'react';
import { useHardware } from '../context/HardwareContext';
import * as XLSX from 'xlsx';
import { 
  Activity, Users, Settings, BellRing, UserPlus, CloudSun, Lock, 
  Search, Camera, TrendingUp, TrendingDown, Scan, Smartphone, Building, 
  ChevronDown, ChevronUp, Database, FileSpreadsheet, Trash2, Edit, X, Save, Send, ShieldCheck, Key, Printer, Filter, Wallet, AlertTriangle, CheckCircle2, Sliders, Receipt
} from 'lucide-react';
import NetworkBackground from '../components/NetworkBackground';

type Role = 'MASTER_ADMIN' | 'ADMIN' | 'USER';

interface User { id: string; full_name: string; username: string; role: Role; nfc_enabled: boolean; }
interface Rate { pair: string; baseFlag: string; targetFlag: string; buy: number; sell: number; flash: 'none'|'up'|'down'; }
interface Customer { id: string; full_name: string; identity_number: string; phone: string; customer_type: 'INDIVIDUAL'|'CORPORATE'; tax_id?: string; tax_office?: string; authorized_persons?: any[]; country?: string; address?: string;}
interface Transaction { id: string; created_at: string; user_name: string; type: string; debit_amount: number; currency: string; status: string; customer_name: string; customer_id: string; credit_amount: number; credit_currency?: string; }

const INITIAL_RATES: Rate[] = [
  { pair: 'USD/TRY', baseFlag: '🇺🇸', targetFlag: '🇹🇷', buy: 321500, sell: 324500, flash: 'none' },
  { pair: 'EUR/TRY', baseFlag: '🇪🇺', targetFlag: '🇹🇷', buy: 345000, sell: 348500, flash: 'none' },
  { pair: 'GBP/TRY', baseFlag: '🇬🇧', targetFlag: '🇹🇷', buy: 402000, sell: 406000, flash: 'none' },
  { pair: 'XAU/TRY', baseFlag: '🪙', targetFlag: '🇹🇷', buy: 2350000, sell: 2380000, flash: 'none' },
];

const API_BASE = 'http://localhost:3030';

export default function ValoTerminal() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Helper for authorized fetch
  const authFetch = async (url: string, options: any = {}) => {
    const t = token || localStorage.getItem('valo_token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${t}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
       setUser(null); setToken(null); localStorage.removeItem('valo_token');
    }
    return res;
  };
  const [view, setView] = useState<'EXCHANGE'|'REPORTS'|'CUSTOMERS'|'SETTINGS'|'CUSTOMER_DETAIL'|'VAULT'>('EXCHANGE');
  const [settingsTab, setSettingsTab] = useState<'GENERAL'|'PRINTER'|'RATES'|'USERS'|'ALARMS'>('GENERAL');
  
  const [time, setTime] = useState('');
  const [weather, setWeather] = useState({ current: '...', today: '...' });
  const [liveRates, setLiveRates] = useState<Rate[]>(INITIAL_RATES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<{currency_code: string, balance: string}[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [vaultStatus, setVaultStatus] = useState<{isOpen: boolean, session: any} | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  
  const checkVault = async () => {
    const res = await authFetch('/vault/status');
    if (res.ok) {
       const status = await res.json();
       setVaultStatus(status);
       if (!status.isOpen) setShowVaultModal(true);
    }
  };

  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('TRY');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [riskInfo, setRiskInfo] = useState<{risk_level: string, reason: string} | null>(null);

  useEffect(() => {
    if (selectedCustomer) {
       authFetch('/api/risk-analyze', { 
         method:'POST', body: JSON.stringify({ customer_id: selectedCustomer.id }) 
       }).then(r => r.json()).then(setRiskInfo).catch(() => {});
    } else {
       setRiskInfo(null);
    }
  }, [selectedCustomer]);

  // Settings states
  const [printerConfig, setPrinterConfig] = useState({ header: 'VALO EXCHANGE DÖVİZ', footer: 'Bizi tercih ettiğiniz için teşekkürler.', paperWidth: '80mm', ip: '192.168.1.100', port: '9100' });
  const [rateSpread, setRateSpread] = useState(300); // Kuruş bazında makas

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('tr-TR')), 1000);
    fetch(`${API_BASE}/system/weather`).then(r => r.json()).then(setWeather).catch(() => {});
    
    // Auto-login
    try {
      const savedToken = localStorage.getItem('valo_token');
      const savedUser = localStorage.getItem('valo_user');
      if (savedToken && savedUser && savedUser !== 'undefined') {
         setToken(savedToken);
         setUser(JSON.parse(savedUser));
      }
    } catch (e) { console.error("Auth restore error", e); }
    return () => clearInterval(t);
  }, []);

  // Parity Logic (Çapraz Kur)
  const getRawResult = () => {
    const amt = Number(amount);
    if (!amt) return 0;
    
    // Find rates relative to TRY
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
      const res = await authFetch('/transactions', {
        method: 'POST', body: JSON.stringify(payload)
      });
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

  const loadData = async () => {
    if (!user) return;
    try {
      const [cRes, tRes, bRes, rRes, uRes, aRes] = await Promise.all([
        authFetch('/customers').catch(() => ({ json: async () => [] })),
        authFetch('/transactions').catch(() => ({ json: async () => [] })),
        authFetch('/system/balances').catch(() => ({ json: async () => [] })),
        authFetch('/rates').catch(() => ({ json: async () => [] })),
        authFetch('/users').catch(() => ({ json: async () => [] })),
        authFetch('/alarms').catch(() => ({ json: async () => [] }))
      ]);
      
      const safeJson = async (r: any) => {
        try { 
          if (!r.ok) return [];
          return await r.json(); 
        } catch (e) { return []; }
      };

      const c = await safeJson(cRes);
      const t = await safeJson(tRes);
      const b = await safeJson(bRes);
      const r = await safeJson(rRes);
      const us = await safeJson(uRes);
      const al = await safeJson(aRes);

      setCustomers(Array.isArray(c) ? c : []); 
      setTransactions(Array.isArray(t) ? t : []); 
      setBalances(Array.isArray(b) ? b : []);
      setUsers(Array.isArray(us) ? us : []);
      setAlarms(Array.isArray(al) ? al : []);
      
      if (Array.isArray(r) && r.length > 0) {
        const updatedRates = INITIAL_RATES.map(base => {
          const match = r.find((db: any) => `${db.base_currency}/${db.target_currency}` === base.pair);
          if (match) {
            return { ...base, buy: match.rate_multiplier, sell: match.rate_multiplier + rateSpread };
          }
          return base;
        });
        setLiveRates(updatedRates);
      }
    } catch (e) { console.error("Data load failed", e); }
  };

  useEffect(() => {
    if (user) {
      loadData();
      checkVault();
    }
  }, [user, view]);
  
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
       loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, rateSpread]);

  if (!user) {
    return (
      <div className="login-wrapper">
         <NetworkBackground />
         <form className="login-box" onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_BASE}/login`, {
               method:'POST', headers:{'Content-Type':'application/json'},
               body: JSON.stringify({username: e.currentTarget.username.value, password: e.currentTarget.password.value})
            });
            if(res.ok) {
               const data = await res.json().catch(() => null);
               if (data && data.token && data.user) {
                  setToken(data.token);
                  setUser(data.user);
                  localStorage.setItem('valo_token', data.token);
                  localStorage.setItem('valo_user', JSON.stringify(data.user));
               } else alert('Giriş verisi hatalı!');
            } else alert('Yetkisiz Giriş!');
         }}>
            <h1>VALO</h1>
            <p>COMMAND_CENTER_AUTH</p>
            <input name="username" placeholder="OPERATÖR ID" required />
            <input name="password" type="password" placeholder="ERİŞİM KODU" required />
            <button type="submit">TERMİNALE BAĞLAN</button>
         </form>
         <style>{`
          .login-wrapper { height:100vh; width:100vw; display:flex; align-items:center; justify-content:center; }
          .login-box { z-index:10; background:rgba(15,23,42,0.9); padding:60px; border-radius:32px; border:1px solid #334155; width:420px; text-align:center; backdrop-filter:blur(20px); box-shadow:0 0 100px rgba(0,0,0,0.8); }
          .login-box h1 { color:#fbbf24; letter-spacing:15px; font-size:3.5rem; margin:0; }
          .login-box p { color:#64748b; font-size:0.7rem; font-weight:900; margin-bottom:40px; }
          .login-box input { width:100%; padding:18px; background:#020617; border:1px solid #334155; border-radius:12px; color:white; margin-bottom:15px; outline:none; font-weight:bold; }
          .login-box button { width:100%; padding:20px; background:#fbbf24; color:black; font-weight:900; border:none; border-radius:12px; cursor:pointer; font-size:1.1rem; }
         `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <NetworkBackground />
      <header className="header">
         <div className="h-left" onClick={() => setView('EXCHANGE')} style={{cursor:'pointer'}}>
            <div className="logo">VALO</div>
         </div>
         <div className="h-center">
            <div className="weather-top"><span>{weather.location}</span><strong>{weather.current}</strong></div>
            {time}
         </div>
         <div className="h-right">
            <nav className="nav">
               <button onClick={() => setView('EXCHANGE')} className={view==='EXCHANGE'?'active':''}>GİŞE</button>
               <button onClick={() => setView('VAULT')} className={view==='VAULT'?'active':''}>KASA</button>
               <button onClick={() => setView('REPORTS')} className={view==='REPORTS'?'active':''}>İŞLEMLER</button>
               <button onClick={() => setView('CUSTOMERS')} className={view==='CUSTOMERS'?'active':''}>MÜŞTERİ</button>
               {user.role === 'MASTER_ADMIN' && <button onClick={() => setView('SETTINGS')} className={view==='SETTINGS'?'active':''}><Settings size={18}/></button>}
            </nav>
            <div className="u-box"><strong>{user.full_name.toUpperCase()}</strong><br/><span>{user.role}</span></div>
            <button onClick={() => { setUser(null); localStorage.clear(); }} className="btn-exit">ÇIKIŞ</button>
         </div>
      </header>

      <div className="body">
         <aside className="sidebar">
            <div className="kasa-box">
               <div className="k-head"><Wallet size={16}/> PERSONEL KASASI</div>
               {balances.length > 0 ? balances.map(b => (
                 <div key={b.currency_code} className="k-row">
                   <span>{b.currency_code === 'TRY' ? '₺' : b.currency_code === 'USD' ? '$' : b.currency_code === 'EUR' ? '€' : '🪙'} {b.currency_code}</span>
                   <strong>{(Number(b.balance)/100).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
                 </div>
               )) : (
                 <div className="k-row"><span>Bakiyeler yükleniyor...</span></div>
               )}
            </div>
            <h5 className="side-title"><Activity size={14}/> CANLI PİYASA</h5>
            {liveRates.map(r => (
              <div key={r.pair} className={`rate-card ${r.flash}`}>
                 <div className="r-head"><span>{r.baseFlag}</span><strong>{r.pair}</strong><span>{r.targetFlag}</span></div>
                 <div className="r-vals"><div><div className="lbl">ALIŞ</div><div className="buy">{(r.buy/10000).toFixed(4)}</div></div><div><div className="lbl" style={{textAlign:'right'}}>SATIŞ</div><div className="sell">{(r.sell/10000).toFixed(4)}</div></div></div>
              </div>
            ))}
         </aside>

         <main className="content">
            {view === 'EXCHANGE' && (
              <div className="ex-wrap">
                 <button className={`kyc-btn ${selectedCustomer?'ok':''}`} onClick={()=>setShowKYCModal(true)}>
                    {selectedCustomer ? <ShieldCheck color="white"/> : <UserPlus/>}
                    {selectedCustomer ? `MÜŞTERİ: ${selectedCustomer.full_name.toUpperCase()}` : "MÜŞTERİ SEÇİN (F2)"}
                 </button>
                 <div className={`ex-card ${Number(amount) >= 5000 || riskInfo?.risk_level === 'CRITICAL' ? 'risk' : ''}`}>
                    {Number(amount) >= 5000 && <div className="risk-banner"><AlertTriangle size={24}/><span>YÜKSEK TUTARLI İŞLEM: ÜST YÖNETİCİ ONAYI VE KYC ZORUNLUDUR!</span></div>}
                    {riskInfo?.risk_level === 'CRITICAL' && <div className="risk-banner" style={{background:'#7c3aed'}}><ShieldCheck size={24}/><span>YAPAY ZEKA RİSKİ: {riskInfo.reason}</span></div>}
                    <div className="ex-in">
                       <label>ALINAN (MÜŞTERİ VERİR)</label>
                       <div className="ex-row">
                          <select value={baseCurrency} onChange={e=>setBaseCurrency(e.target.value)}>
                             <option>USD</option><option>EUR</option><option>GBP</option><option>TRY</option>
                          </select>
                          <input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0.00" autoFocus />
                       </div>
                    </div>
                    <div className="ex-in">
                       <label>VERİLEN (MÜŞTERİ ALIR)</label>
                       <div className="ex-row">
                          <select value={targetCurrency} onChange={e=>setTargetCurrency(e.target.value)}>
                             <option>TRY</option><option>USD</option><option>EUR</option><option>GBP</option>
                          </select>
                          <div className="res-val">{formatCurrency(getRawResult())}</div>
                       </div>
                    </div>
                    <button className="btn-confirm" onClick={()=>setShowDenomModal(true)}>İŞLEMİ ONAYLA (F10)</button>
                 </div>
              </div>
            )}

            {(view as any) === 'VAULT' && (
              <div className="page">
                 <div className="page-header">
                    <h2><Wallet size={24}/> KASA İŞLEMLERİ</h2>
                    <div className="page-actions">
                       <span className={`status-badge ${vaultStatus?.isOpen ? 'open' : 'closed'}`}>
                          {vaultStatus?.isOpen ? 'KASA AÇIK' : 'KASA KAPALI'}
                       </span>
                    </div>
                 </div>
                 
                 <div className="s-grid">
                    <div className="settings-panel">
                       <h3><Send size={20}/> ANA KASADAN PARA AL</h3>
                       <p style={{color:'#64748b', fontSize:'0.8rem'}}>Yöneticiden veya ana kasadan fiziksel nakit aldığınızda buraya girin.</p>
                       <form onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const payload = { amount: parseInt(fd.get('amount') as string) * 100, currency: fd.get('currency'), direction: 'FROM_MASTER' };
                          const res = await authFetch('/vault/transfer', { method:'POST', body: JSON.stringify(payload) });
                          if(res.ok) { alert('Transfer Başarılı'); loadData(); e.currentTarget.reset(); }
                       }}>
                          <div className="s-row"><label>BİRİM</label><select name="currency"><option>TRY</option><option>USD</option><option>EUR</option></select></div>
                          <div className="s-row"><label>TUTAR</label><input name="amount" type="number" required /></div>
                          <button type="submit" className="btn-primary" style={{width:'100%', justifyContent:'center'}}>TRANSFERİ ONAYLA</button>
                       </form>
                    </div>

                    <div className="settings-panel">
                       <h3><TrendingDown size={20}/> GÜN SONU / KASA KAPANIŞI</h3>
                       <p style={{color:'#64748b', fontSize:'0.8rem'}}>Mesai bitiminde elinizdeki nakdi ana kasaya devredin.</p>
                       <div className="k-list" style={{margin:'20px 0'}}>
                          {balances.map(b => (
                             <div key={b.currency_code} className="k-row">
                                <span>{b.currency_code}</span>
                                <strong>{(Number(b.balance)/100).toLocaleString('tr-TR')}</strong>
                             </div>
                          ))}
                       </div>
                       <button className="btn-secondary" style={{width:'100%', color:'#ef4444', borderColor:'#ef4444'}} onClick={() => alert('Kasa Kapanışı ve Ana Kasa Devri Yapıldı.')}>GÜNÜ KAPAT VE DEVRET</button>
                    </div>
                 </div>
                 <style>{`
                    .status-badge { padding:8px 16px; border-radius:100px; font-weight:900; font-size:0.7rem; letter-spacing:1px; }
                    .status-badge.open { background:rgba(16,185,129,0.1); color:#10b981; border:1px solid #10b981; }
                    .status-badge.closed { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid #ef4444; }
                 `}</style>
              </div>
            )}

            {view === 'REPORTS' && (
              <div className="page">
                 <div className="page-header">
                    <h2><FileSpreadsheet size={24}/> SON İŞLEMLER</h2>
                    <div className="page-actions">
                       <button className="btn-secondary" onClick={() => window.print()}><Printer size={18}/> PDF / YAZDIR</button>
                    </div>
                 </div>
                 <div className="table-wrap">
                    <table className="valo-table">
                       <thead>
                          <tr>
                             <th>TARİH</th>
                             <th>MÜŞTERİ</th>
                             <th>OPERATÖR</th>
                             <th>TİP</th>
                             <th style={{textAlign:'right'}}>TUTAR (ALINAN)</th>
                             <th style={{textAlign:'right'}}>TUTAR (VERİLEN)</th>
                             <th>STATÜ</th>
                          </tr>
                       </thead>
                       <tbody>
                          {transactions.map(t => (
                             <tr key={t.id}>
                                <td>{new Date(t.created_at).toLocaleString('tr-TR')}</td>
                                <td>{t.customer_name || 'GİŞE MÜŞTERİSİ'}</td>
                                <td>{t.user_name}</td>
                                <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                                <td style={{textAlign:'right', fontFamily:'monospace', fontWeight:'bold'}}>{(t.debit_amount/100).toLocaleString('tr-TR')} {t.currency}</td>
                                <td style={{textAlign:'right', fontFamily:'monospace', color:'#10b981'}}>{t.credit_amount ? (t.credit_amount/100).toLocaleString('tr-TR') : '---'} {t.credit_currency}</td>
                                <td><span className="status-ok">{t.status}</span></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {view === 'CUSTOMERS' && (
              <div className="page">
                 <div className="page-header">
                    <h2><Users size={24}/> MÜŞTERİ YÖNETİMİ</h2>
                    <div className="page-actions">
                       <button className="btn-primary"><UserPlus size={18}/> YENİ MÜŞTERİ</button>
                       <button className="btn-secondary" onClick={() => window.print()}><FileSpreadsheet size={18}/> EXPORT PDF</button>
                    </div>
                 </div>
                 <div className="table-wrap">
                    <table className="valo-table">
                       <thead>
                          <tr>
                             <th>MÜŞTERİ ADI</th>
                             <th>TİP</th>
                             <th>KİMLİK / VERGİ NO</th>
                             <th>TELEFON</th>
                             <th>ÜLKE</th>
                             <th style={{textAlign:'right'}}>İŞLEMLER</th>
                          </tr>
                       </thead>
                       <tbody>
                          {customers.map(c => (
                             <tr key={c.id}>
                                <td style={{fontWeight:'bold'}}>{c.full_name}</td>
                                <td>{c.customer_type}</td>
                                <td style={{fontFamily:'monospace'}}>{c.identity_number || c.tax_id}</td>
                                <td>{c.phone}</td>
                                <td>{c.country}</td>
                                <td style={{textAlign:'right'}}>
                                   <button className="icon-btn"><Edit size={16}/></button>
                                   <button className="icon-btn risk"><AlertTriangle size={16}/></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {view === 'SETTINGS' && (
              <div className="page">
                 <div className="settings-nav">
                    <button onClick={()=>setSettingsTab('GENERAL')} className={settingsTab==='GENERAL'?'active':''}><Sliders size={18}/> GENEL</button>
                    <button onClick={()=>setSettingsTab('USERS')} className={settingsTab==='USERS'?'active':''}><Users size={18}/> PERSONEL</button>
                    <button onClick={()=>setSettingsTab('ALARMS')} className={settingsTab==='ALARMS'?'active':''}><BellRing size={18}/> ALARMLAR</button>
                    <button onClick={()=>setSettingsTab('PRINTER')} className={settingsTab==='PRINTER'?'active':''}><Printer size={18}/> YAZICI</button>
                    <button onClick={()=>setSettingsTab('RATES')} className={settingsTab==='RATES'?'active':''}><TrendingUp size={18}/> KUR & MAKAS</button>
                 </div>
                 
                 {settingsTab === 'GENERAL' && (
                    <div className="settings-panel">
                       <h3>SİSTEM YAPILANDIRMASI</h3>
                       <div className="s-row"><label>TELEGRAM BOT TOKEN</label><input placeholder="..." /></div>
                       <div className="s-row"><label>MERKEZİ CHAT ID</label><input placeholder="..." /></div>
                       <button className="btn-save">DEĞİŞİKLİKLERİ KAYDET</button>
                    </div>
                 )}

                 {settingsTab === 'USERS' && (
                    <div className="settings-panel">
                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                          <h3><Users size={20}/> PERSONEL YÖNETİMİ</h3>
                          <button className="btn-primary" style={{padding:'8px 16px', fontSize:'0.7rem'}}><UserPlus size={14}/> YENİ EKLE</button>
                       </div>
                       <div className="table-wrap">
                          <table className="valo-table">
                             <thead><tr><th>AD SOYAD</th><th>KULLANICI ADI</th><th>ROL</th><th>NFC</th><th>STATÜ</th></tr></thead>
                             <tbody>
                                {users.map(u => (
                                   <tr key={u.id}>
                                      <td style={{fontWeight:'bold'}}>{u.full_name}</td>
                                      <td>{u.username}</td>
                                      <td><span className="badge">{u.role}</span></td>
                                      <td>{u.nfc_enabled ? 'EVET' : 'HAYIR'}</td>
                                      <td><span className="status-ok">AKTİF</span></td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}

                 {settingsTab === 'ALARMS' && (
                    <div className="settings-panel">
                       <h3><BellRing size={20}/> AKTİF ALARMLAR</h3>
                       <div className="table-wrap">
                          <table className="valo-table">
                             <thead><tr><th>TİP</th><th>EŞİK DEĞERİ</th><th>TELEGRAM</th><th>DURUM</th></tr></thead>
                             <tbody>
                                {alarms.map(a => (
                                   <tr key={a.id}>
                                      <td>{a.condition_type}</td>
                                      <td>{a.threshold_val}</td>
                                      <td>{a.telegram_enabled ? 'EVET' : 'HAYIR'}</td>
                                      <td><span className="status-ok">ÇALIŞIYOR</span></td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}

                 {settingsTab === 'PRINTER' && (
                    <div className="settings-panel">
                       <h3><Receipt size={24}/> FİŞ VE YAZICI AYARLARI</h3>
                       <div className="s-grid">
                          <div className="s-row"><label>FİŞ BAŞLIĞI</label><input value={printerConfig.header} onChange={e=>setPrinterConfig({...printerConfig, header: e.target.value})} /></div>
                          <div className="s-row"><label>FİŞ ALTBİLGİ (FOOTER)</label><input value={printerConfig.footer} onChange={e=>setPrinterConfig({...printerConfig, footer: e.target.value})} /></div>
                       </div>
                       <hr className="s-hr" />
                       <h4><Database size={18}/> AĞ YAZICISI (TCP/IP)</h4>
                       <div className="s-grid">
                          <div className="s-row"><label>YAZICI IP ADRESİ</label><input value={printerConfig.ip} onChange={e=>setPrinterConfig({...printerConfig, ip: e.target.value})} placeholder="192.168.1.X" /></div>
                          <div className="s-row"><label>PORT</label><input value={printerConfig.port} onChange={e=>setPrinterConfig({...printerConfig, port: e.target.value})} placeholder="9100" /></div>
                          <div className="s-row"><label>KAĞIT GENİŞLİĞİ</label><select><option>80mm (Standart)</option><option>58mm (Kompakt)</option></select></div>
                       </div>
                       <button className="btn-save">YAZICIYI TEST ET VE KAYDET</button>
                    </div>
                 )}

                 {settingsTab === 'RATES' && (
                    <div className="settings-panel">
                       <h3><Activity size={24}/> KUR VE MAKAS YÖNETİMİ</h3>
                       <div className="s-row"><label>GLOBAL MAKAS (SPREAD)</label><input type="number" value={rateSpread} onChange={e=>setRateSpread(parseInt(e.target.value))} /></div>
                       <div className="s-row"><label>AKTİF BİRİMLER</label><div className="chips"><span className="chip">USD</span><span className="chips active">EUR</span><span className="chip">GBP</span><span className="chip">XAU</span></div></div>
                       <button className="btn-save">KUR AYARLARINI GÜNCELLE</button>
                    </div>
                 )}
              </div>
            )}
         </main>
      </div>

      {showDenomModal && (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth:'500px', textAlign:'center'}}>
            <Cpu size={48} color="#fbbf24" style={{marginBottom:'20px'}}/>
            <h2>KUPÜR GİRİŞİ / SAYIM</h2>
            <p style={{color:'#64748b'}}>Donanımdan gelen sayım verileri bekleniyor...</p>
            
            {/* Auto-fill simulation from HardwareContext if any message arrived */}
            <div style={{padding:'20px', background:'rgba(255,255,255,0.05)', borderRadius:'12px', margin:'20px 0'}}>
               <div style={{fontSize:'0.8rem', color:'#64748b'}}>SAYILAN TUTAR</div>
               <div style={{fontSize:'2.5rem', fontWeight:'900', color:'#fbbf24'}}>{amount || '0.00'} {baseCurrency}</div>
            </div>

            <button className="btn-confirm" onClick={handleConfirm}>TAMAMLA VE YAZDIR (F10)</button>
          </div>
        </div>
      )}

      {showKYCModal && (
        <div className="modal-bg">
          <div className="modal">
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
               <h2>MÜŞTERİ SEÇİMİ / YENİ KAYIT</h2>
               <button className="icon-btn" onClick={()=>setShowKYCModal(false)}><X/></button>
            </div>
            
            <div className="modal-grid">
               <div className="m-section">
                  <div className="ocr-zone" onClick={() => {
                     const input = document.createElement('input');
                     input.type = 'file';
                     input.accept = 'image/*';
                     input.onchange = async (e) => {
                        const file = (e.target as any).files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                           const base64 = reader.result;
                           const res = await authFetch('/api/ocr', { method:'POST', body: JSON.stringify({image: base64}) });
                           if(res.ok) {
                              const data = await res.json();
                              const form = document.getElementById('kyc-form') as HTMLFormElement;
                              (form.elements.namedItem('full_name') as HTMLInputElement).value = data.full_name;
                              (form.elements.namedItem('identity_number') as HTMLInputElement).value = data.identity_number;
                              alert("Kimlik verileri ayrıştırıldı.");
                           }
                        };
                        reader.readAsDataURL(file);
                     };
                     input.click();
                  }}><Camera size={32}/><br/>KİMLİK TARA (OCR)</div>
                  <div className="m-list">
                     {customers.map(c=>(
                        <div key={c.id} className="m-item" onClick={()=>{setSelectedCustomer(c); setShowKYCModal(false)}}>
                           <strong>{c.full_name}</strong>
                           <span style={{fontSize:'0.7rem', color:'#64748b', display:'block'}}>{c.identity_number}</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="m-section form-section">
                  <h3>HIZLI KAYIT</h3>
                  <form id="kyc-form" onSubmit={async (e) => {
                     e.preventDefault();
                     const fd = new FormData(e.currentTarget);
                     const payload = Object.fromEntries(fd.entries());
                     const res = await authFetch('/customers', {
                        method:'POST', body:JSON.stringify(payload)
                     });
                     if(res.ok) { loadData(); alert("Müşteri Kaydedildi."); }
                  }}>
                     <div className="s-row"><label>AD SOYAD / ÜNVAN</label><input name="full_name" required /></div>
                     <div className="s-row">
                        <label>TC KİMLİK NO (11 HANE)</label>
                        <input name="identity_number" required maxLength={11} minLength={11} pattern="\d*" placeholder="00000000000" />
                     </div>
                     <div className="s-row">
                        <label>TELEFON (+90...)</label>
                        <input name="phone" required placeholder="+90 5XX XXX XX XX" pattern="\+90\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}" />
                     </div>
                     <button type="submit" className="btn-primary" style={{width:'100%', justifyContent:'center'}}>KAYDET</button>
                  </form>
               </div>
            </div>
          </div>
          <style>{`
            .modal-grid { display:grid; grid-template-columns: 1fr 1fr; gap:40px; }
            .m-section h3 { color:#fbbf24; margin-bottom:20px; font-size:1rem; }
            .form-section { border-left:1px solid #1e293b; padding-left:40px; }
            .m-item:hover { background:rgba(251,191,36,0.1); color:#fbbf24; }
          `}</style>
        </div>
      )}

      {showVaultModal && (
        <div className="modal-bg">
          <div className="modal" style={{maxWidth:'500px'}}>
            <div style={{textAlign:'center', marginBottom:'30px'}}>
              <Wallet size={64} color="#fbbf24" style={{marginBottom:'20px'}}/>
              <h2>GÜNLÜK KASA AÇILIŞI</h2>
              <p style={{color:'#64748b'}}>Güne başlamak için elinizdeki nakit mevcudunu doğrulayın.</p>
            </div>
            <div className="s-row"><label>TRY MEVCUT (ADET/TUTAR)</label><input type="number" defaultValue="0" id="open-try" style={{fontSize:'1.5rem'}} /></div>
            <div className="s-row"><label>USD MEVCUT (ADET/TUTAR)</label><input type="number" defaultValue="0" id="open-usd" style={{fontSize:'1.5rem'}} /></div>
            <button className="btn-confirm" style={{marginTop:'30px', borderRadius:'16px'}} onClick={async () => {
                const payload = {
                  opening_balances: {
                    TRY: parseInt((document.getElementById('open-try') as HTMLInputElement).value) * 100,
                    USD: parseInt((document.getElementById('open-usd') as HTMLInputElement).value) * 100
                  }
                };
                const res = await authFetch('/vault/open', { method:'POST', body: JSON.stringify(payload) });
                if(res.ok) { setShowVaultModal(false); checkVault(); loadData(); }
            }}>KASAYI AÇ VE TERMİNALE BAĞLAN</button>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body { margin:0; background:#020617; color:white; font-family:'Inter', sans-serif; overflow:hidden; }
        .app { height:100vh; display:flex; flex-direction:column; position:relative; overflow:hidden; }
        
        /* HEADER */
        .header { height:70px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(15,23,42,0.8); backdrop-filter:blur(20px); display:flex; align-items:center; padding:0 24px; z-index:100; flex-shrink:0; }
        .logo { font-size:1.8rem; font-weight:900; color:#fbbf24; letter-spacing:3px; text-shadow:0 0 20px rgba(251,191,36,0.3); }
        
        .h-center { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-size:2.2rem; font-weight:900; color:#ef4444; font-family:monospace; }
        .weather-top { display:flex; align-items:center; gap:8px; font-size:0.65rem; color:#64748b; font-weight:900; font-family:'Inter', sans-serif; }
        
        .nav button { background:none; border:none; color:#94a3b8; font-weight:700; cursor:pointer; padding:8px 12px; border-radius:8px; font-size:0.75rem; transition:0.2s; }
        .u-box { text-align:right; border-right:1px solid #334155; padding-right:16px; line-height:1.2; font-size:0.7rem; }

        .body { flex:1; display:flex; overflow:hidden; min-height:0; }
        
        /* SIDEBAR */
        .sidebar { width:280px; border-right:1px solid rgba(255,255,255,0.05); background:rgba(15,23,42,0.4); padding:16px; overflow-y:auto; flex-shrink:0; }
        .kasa-box { background:rgba(2,6,23,0.6); border:1px solid #fbbf24; border-radius:12px; padding:16px; margin-bottom:20px; }
        .k-head { display:flex; align-items:center; gap:8px; color:#fbbf24; font-weight:900; font-size:0.7rem; margin-bottom:12px; }
        .k-row strong { color:white; font-size:1rem; font-family:monospace; }
        
        .rate-card { background:rgba(15,23,42,0.8); border:1px solid #334155; border-radius:10px; padding:10px; margin-bottom:10px; }
        .r-head { display:flex; align-items:center; gap:6px; margin-bottom:6px; font-size:0.75rem; }
        .r-vals .buy, .r-vals .sell { color:white; font-size:0.95rem; font-weight:700; }

        /* CONTENT */
        .content { flex:1; padding:24px; overflow-y:auto; background: radial-gradient(circle at top right, rgba(251,191,36,0.02), transparent 40%); min-height: 100%; }
        
        /* EXCHANGE VIEW */
        .ex-wrap { max-width:700px; margin:0 auto; padding-bottom:50px; }
        .ex-in { padding:30px; border-bottom:1px solid #1e293b; }
        .ex-row input { flex:1; background:none; border:none; border-bottom:4px solid #fbbf24; color:#fbbf24; font-size:4rem; font-weight:900; text-align:right; outline:none; font-family:monospace; }
        .res-val { flex:1; font-size:4rem; font-weight:900; color:#10b981; text-align:right; font-family:monospace; }
        .btn-confirm { width:100%; padding:24px; background:#fbbf24; color:black; font-weight:900; font-size:1.5rem; border:none; cursor:pointer; }

        /* DATA PAGES */
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; }
        .page-header h2 { margin:0; font-size:2rem; font-weight:900; color:#fbbf24; display:flex; align-items:center; gap:16px; }
        
        .settings-nav { display:flex; gap:6px; margin-bottom:24px; border-bottom:1px solid #1e293b; padding-bottom:12px; }
        .settings-nav button { padding:10px 20px; background:none; border:none; color:#64748b; cursor:pointer; font-weight:900; font-size:0.75rem; display:flex; align-items:center; gap:8px; }
        .settings-nav button.active { color:#fbbf24; border-bottom:2px solid #fbbf24; }
        
        .settings-panel { background:rgba(15,23,42,0.8); padding:32px; border-radius:24px; border:1px solid #334155; margin-bottom:24px; }
        .settings-panel h3 { margin:0 0 24px 0; font-size:1.1rem; color:#fbbf24; }
        .s-row { margin-bottom:20px; display:flex; flex-direction:column; gap:8px; }
        .s-row label { color:#64748b; font-weight:900; font-size:0.7rem; }
        .s-row input, .s-row select { padding:12px; background:#020617; border:1px solid #334155; color:white; border-radius:10px; font-weight:700; }
        .btn-save { padding:12px 24px; background:#10b981; color:black; font-weight:900; border:none; border-radius:10px; cursor:pointer; font-size:0.8rem; }
        
        .table-wrap { background:rgba(2,6,23,0.5); border:1px solid #1e293b; border-radius:16px; overflow:hidden; }
        .valo-table { width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem; }
        .valo-table th { padding:16px; color:#475569; font-weight:900; border-bottom:1px solid #1e293b; text-transform:uppercase; font-size:0.7rem; }
        .valo-table td { padding:16px; border-bottom:1px solid rgba(255,255,255,0.02); }
        
        .badge { padding:4px 8px; background:rgba(255,255,255,0.05); border-radius:4px; font-size:0.65rem; font-weight:900; }
        .status-ok { color:#10b981; font-weight:900; display:flex; align-items:center; gap:6px; font-size:0.75rem; }
        .status-ok::before { content:''; width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 10px #10b981; }

        .modal-bg { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(2,6,23,0.9); z-index:2000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); }
        .modal { background:#0f172a; width:90%; max-width:800px; padding:40px; border-radius:32px; border:1px solid #334155; max-height:90vh; overflow-y:auto; }

        @media print {
           .header, .sidebar, .nav, .page-header button, .btn-confirm, .settings-nav { display:none !important; }
           body { background:white; color:black; overflow:visible; }
           .app { height:auto; overflow:visible; }
           .content { padding:0; overflow:visible; }
           .table-wrap { border:1px solid #eee; background:white; }
           .valo-table td, .valo-table th { color:black; border-bottom:1px solid #eee; }
        }
      `}</style>
    </div>
  );
}
