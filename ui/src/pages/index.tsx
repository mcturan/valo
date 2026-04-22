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
  const [view, setView] = useState<'EXCHANGE'|'REPORTS'|'CUSTOMERS'|'SETTINGS'|'CUSTOMER_DETAIL'>('EXCHANGE');
  const [settingsTab, setSettingsTab] = useState<'GENERAL'|'PRINTER'|'RATES'>('GENERAL');
  
  const [time, setTime] = useState('');
  const [weather, setWeather] = useState({ current: '...', today: '...' });
  const [liveRates, setLiveRates] = useState<Rate[]>(INITIAL_RATES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<{currency_code: string, balance: string}[]>([]);
  
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('TRY');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Settings states
  const [printerConfig, setPrinterConfig] = useState({ header: 'VALO EXCHANGE DÖVİZ', footer: 'Bizi tercih ettiğiniz için teşekkürler.', paperWidth: '80mm', ip: '192.168.1.100', port: '9100' });
  const [rateSpread, setRateSpread] = useState(300); // Kuruş bazında makas

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('tr-TR')), 1000);
    fetch(`${API_BASE}/system/weather`).then(r => r.json()).then(setWeather).catch(() => {});
    
    // Auto-login
    const savedToken = localStorage.getItem('valo_token');
    const savedUser = localStorage.getItem('valo_user');
    if (savedToken && savedUser) {
       setToken(savedToken);
       setUser(JSON.parse(savedUser));
    }
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
         const err = await res.json();
         alert("HATA: " + err.error);
      }
    } catch (e) { alert("VERİTABANI BAĞLANTI HATASI!"); }
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const [cRes, tRes, bRes, rRes] = await Promise.all([
        authFetch('/customers'),
        authFetch('/transactions'),
        authFetch('/system/balances'),
        authFetch('/rates')
      ]);
      
      const c = await cRes.json();
      const t = await tRes.json();
      const b = await bRes.json();
      const r = await rRes.json();

      setCustomers(Array.isArray(c) ? c : []); 
      setTransactions(Array.isArray(t) ? t : []); 
      setBalances(Array.isArray(b) ? b : []);
      
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

  useEffect(() => { loadData(); }, [user, view]);
  
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(loadData, 10000);
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
               const data = await res.json();
               setToken(data.token);
               setUser(data.user);
               localStorage.setItem('valo_token', data.token);
               localStorage.setItem('valo_user', JSON.stringify(data.user));
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
         <div className="h-left"><div className="logo">VALO</div><div className="weather"><span>ANLIK</span><strong>{weather.current}</strong></div></div>
         <div className="h-center">{time}</div>
         <div className="h-right">
            <nav className="nav">
               <button onClick={() => setView('EXCHANGE')} className={view==='EXCHANGE'?'active':''}>GİŞE</button>
               {user.role !== 'USER' && <button onClick={() => setView('REPORTS')} className={view==='REPORTS'?'active':''}>İŞLEMLER</button>}
               <button onClick={() => setView('CUSTOMERS')} className={view==='CUSTOMERS'?'active':''}>MÜŞTERİ</button>
               {user.role === 'MASTER_ADMIN' && <button onClick={() => setView('SETTINGS')} className={view==='SETTINGS'?'active':''}><Settings size={18}/></button>}
            </nav>
            <div className="u-box"><strong>{user.full_name.toUpperCase()}</strong><br/><span>{user.role}</span></div>
            <button onClick={() => setUser(null)} className="btn-exit">ÇIKIŞ</button>
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
                 <div className={`ex-card ${Number(amount) >= 5000 ? 'risk' : ''}`}>
                    {Number(amount) >= 5000 && <div className="risk-banner"><AlertTriangle size={24}/><span>YÜKSEK TUTARLI İŞLEM: ÜST YÖNETİCİ ONAYI VE KYC ZORUNLUDUR!</span></div>}
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
        <div className="modal-bg"><div className="modal" style={{maxWidth:'500px'}}><h2>KUPÜR GİRİŞİ</h2><p>Banknot dökümünü doğrulayın.</p><button className="btn-confirm" onClick={handleConfirm}>TAMAMLA VE YAZDIR</button></div></div>
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
                  <div className="ocr-zone"><Camera size={32}/><br/>KİMLİK TARA (OCR)</div>
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
                  <form onSubmit={async (e) => {
                     e.preventDefault();
                     const fd = new FormData(e.currentTarget);
                     const payload = Object.fromEntries(fd.entries());
                     const res = await fetch('http://localhost:3030/customers', {
                        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
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

      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        body { margin:0; background:#020617; color:white; font-family:'Inter', sans-serif; overflow:hidden; }
        .app { height:100vh; display:flex; flex-direction:column; position:relative; }
        
        /* HEADER */
        .header { height:90px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(15,23,42,0.8); backdrop-filter:blur(20px); display:flex; align-items:center; padding:0 32px; z-index:100; box-shadow: 0 4px 30px rgba(0,0,0,0.5); }
        .logo { font-size:2.8rem; font-weight:900; color:#fbbf24; letter-spacing:6px; text-shadow:0 0 30px rgba(251,191,36,0.4); }
        .weather { margin-left:20px; color:#64748b; font-size:0.75rem; font-weight:700; border-left:1px solid #334155; padding-left:20px; }
        .weather strong { color:white; display:block; font-size:1rem; }
        .h-center { flex:1; text-align:center; font-size:4.5rem; font-weight:900; color:#ef4444; font-family:monospace; letter-spacing:4px; text-shadow: 0 0 20px rgba(239,68,68,0.2); }
        .h-right { display:flex; align-items:center; gap:24px; }
        
        .nav { display:flex; gap:12px; }
        .nav button { background:none; border:none; color:#94a3b8; font-weight:900; cursor:pointer; padding:12px 20px; border-radius:12px; font-size:0.85rem; letter-spacing:1px; transition:0.2s; }
        .nav button.active { color:#fbbf24; background:rgba(251,191,36,0.1); box-shadow: inset 0 0 10px rgba(251,191,36,0.1); }
        .u-box { text-align:right; border-right:1px solid #334155; padding-right:24px; line-height:1.2; }
        .u-box strong { color:white; font-size:0.9rem; }
        .u-box span { color:#64748b; font-size:0.7rem; font-weight:900; }
        .btn-exit { padding:8px 16px; background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:8px; font-weight:900; font-size:0.7rem; cursor:pointer; }

        .body { flex:1; display:flex; overflow:hidden; z-index:10; }
        
        /* SIDEBAR */
        .sidebar { width:340px; border-right:1px solid rgba(255,255,255,0.05); background:rgba(15,23,42,0.4); padding:24px; overflow-y:auto; }
        .kasa-box { background:rgba(2,6,23,0.6); border:1px solid #fbbf24; border-radius:20px; padding:24px; margin-bottom:32px; box-shadow: 0 0 40px rgba(251,191,36,0.05); }
        .k-head { display:flex; align-items:center; gap:10px; color:#fbbf24; font-weight:900; font-size:0.8rem; letter-spacing:1.5px; margin-bottom:20px; }
        .k-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid rgba(251,191,36,0.1); padding-bottom:12px; }
        .k-row span { color:#94a3b8; font-weight:700; font-size:0.85rem; }
        .k-row strong { color:white; font-size:1.2rem; font-family:monospace; }
        
        .side-title { color:#64748b; font-weight:900; font-size:0.75rem; letter-spacing:2px; margin:40px 0 20px 0; display:flex; align-items:center; gap:10px; }
        .rate-card { background:rgba(15,23,42,0.8); border:1px solid #334155; border-radius:16px; padding:18px; margin-bottom:16px; transition:0.3s; }
        .rate-card:hover { border-color:#fbbf24; background:rgba(15,23,42,1); }
        .r-head { display:flex; align-items:center; gap:8px; margin-bottom:15px; border-bottom:1px solid #1e293b; padding-bottom:10px; }
        .r-head strong { flex:1; font-size:1.1rem; letter-spacing:1px; }
        .r-vals { display:flex; justify-content:space-between; }
        .r-vals .lbl { color:#64748b; font-size:0.6rem; font-weight:900; margin-bottom:4px; }
        .r-vals .buy { color:white; font-size:1.3rem; font-weight:900; font-family:monospace; }
        .r-vals .sell { color:white; font-size:1.3rem; font-weight:900; font-family:monospace; text-align:right; }

        /* CONTENT */
        .content { flex:1; padding:48px; overflow-y:auto; position:relative; }
        
        /* EXCHANGE VIEW */
        .ex-wrap { max-width:800px; margin:0 auto; }
        .kyc-btn { width:100%; padding:24px; background:rgba(15,23,42,0.8); border:1px dashed #334155; border-radius:20px; color:#94a3b8; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:24px; transition:0.2s; }
        .kyc-btn.ok { border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.05); }
        .ex-card { background:rgba(15,23,42,0.9); border-radius:40px; border:1px solid #334155; overflow:hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
        .ex-card.risk { border:4px solid #f43f5e; box-shadow: 0 0 80px rgba(244,63,94,0.3); }
        .risk-banner { background:#f43f5e; color:white; padding:20px; text-align:center; font-weight:900; letter-spacing:1px; }
        .ex-in { padding:60px; border-bottom:1px solid #1e293b; }
        .ex-in label { display:block; color:#64748b; font-weight:900; font-size:0.85rem; margin-bottom:20px; letter-spacing:2px; }
        .ex-row { display:flex; align-items:center; gap:32px; }
        .ex-row select { background:#0f172a; color:white; border:2px solid #334155; padding:12px; border-radius:12px; font-weight:900; font-size:1.2rem; cursor:pointer; }
        .ex-row input { flex:1; background:none; border:none; border-bottom:6px solid #fbbf24; color:#fbbf24; font-size:7rem; font-weight:900; text-align:right; outline:none; font-family:monospace; }
        .res-val { flex:1; font-size:7rem; font-weight:900; color:#10b981; text-align:right; font-family:monospace; text-shadow: 0 0 30px rgba(16,185,129,0.2); }
        .btn-confirm { width:100%; padding:40px; background:#fbbf24; color:black; font-weight:900; font-size:2.4rem; border:none; cursor:pointer; transition:0.2s; }
        .btn-confirm:hover { background:#fcd34d; transform: scale(1.02); }

        /* DATA PAGES */
        .page { animation: fadeIn 0.3s ease; }
        .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
        .page-header h2 { margin:0; font-size:2.5rem; font-weight:900; letter-spacing:2px; display:flex; align-items:center; gap:20px; color:#fbbf24; }
        .page-actions { display:flex; gap:16px; }
        .btn-primary { padding:14px 28px; background:#fbbf24; color:black; border:none; border-radius:12px; font-weight:900; cursor:pointer; display:flex; align-items:center; gap:10px; }
        .btn-secondary { padding:14px 28px; background:#1e293b; color:white; border:1px solid #334155; border-radius:12px; font-weight:900; cursor:pointer; display:flex; align-items:center; gap:10px; }
        
        .table-wrap { background:rgba(15,23,42,0.8); border:1px solid #334155; border-radius:24px; overflow:hidden; }
        .valo-table { width:100%; border-collapse:collapse; text-align:left; }
        .valo-table th { padding:24px; background:rgba(2,6,23,0.5); color:#64748b; font-weight:900; font-size:0.75rem; letter-spacing:2px; text-transform:uppercase; border-bottom:2px solid #1e293b; }
        .valo-table td { padding:24px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.95rem; }
        .valo-table tr:hover { background:rgba(255,255,255,0.02); }
        
        .badge { padding:6px 12px; border-radius:6px; font-weight:900; font-size:0.7rem; }
        .badge.EXCHANGE { background:rgba(251,191,36,0.1); color:#fbbf24; border:1px solid #fbbf24; }
        .status-ok { color:#10b981; font-weight:900; font-size:0.8rem; display:flex; align-items:center; gap:6px; }
        .status-ok::before { content:''; width:8px; height:8px; background:#10b981; border-radius:50%; box-shadow:0 0 10px #10b981; }
        
        /* SETTINGS GRID */
        .s-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:24px; margin-bottom:32px; }
        .s-hr { border:none; border-top:1px solid #1e293b; margin:40px 0; }
        .settings-panel h4 { margin:0 0 24px 0; color:#fbbf24; font-size:1.2rem; }

        @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

        @media print {
           .header, .sidebar, .nav, .page-actions, .btn-confirm { display:none !important; }
           .app { background:white !important; color:black !important; }
           .content { padding:0 !important; }
           .table-wrap { border:none !important; background:white !important; }
           .valo-table th { color:black !important; border-bottom:2px solid black !important; }
           .valo-table td { color:black !important; border-bottom:1px solid #ccc !important; }
           .logo { color:black !important; text-shadow:none !important; }
        }
      `}</style>
    </div>
  );
}
