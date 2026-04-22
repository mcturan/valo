import React from 'react';
import { Settings, Users, BellRing, Receipt, Database, Activity } from 'lucide-react';

interface SettingsPageProps {
  settingsTab: string;
  setSettingsTab: (tab: any) => void;
  users: any[];
  alarms: any[];
  printerConfig: any;
  setPrinterConfig: (cfg: any) => void;
  rateSpread: number;
  setRateSpread: (val: number) => void;
  onSavePrinter: () => Promise<void>;
  onSaveSpread: () => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  settingsTab, setSettingsTab, users, alarms, printerConfig, setPrinterConfig, rateSpread, setRateSpread,
  onSavePrinter, onSaveSpread
}) => {
  return (
    <div className="page">
       <div className="page-header"><h2><Settings size={24}/> SİSTEM AYARLARI</h2></div>
       <div className="settings-nav">
          <button className={settingsTab==='GENERAL'?'active':''} onClick={()=>setSettingsTab('GENERAL')}>GENEL</button>
          <button className={settingsTab==='PRINTER'?'active':''} onClick={()=>setSettingsTab('PRINTER')}>YAZICI</button>
          <button className={settingsTab==='RATES'?'active':''} onClick={()=>setSettingsTab('RATES')}>KUR/MAKAS</button>
          <button className={settingsTab==='USERS'?'active':''} onClick={()=>setSettingsTab('USERS')}>PERSONEL</button>
          <button className={settingsTab==='ALARMS'?'active':''} onClick={()=>setSettingsTab('ALARMS')}>ALARMLAR</button>
       </div>

       {settingsTab === 'GENERAL' && <div className="settings-panel"><h3>SİSTEM DURUMU</h3><p>Terminal ID: VALO-001</p><p>Versiyon: 1.0.0-PRO</p></div>}

       {settingsTab === 'USERS' && (
          <div className="settings-panel">
             <h3><Users size={20}/> PERSONEL LİSTESİ</h3>
             <div className="table-wrap">
                <table className="valo-table">
                   <thead><tr><th>İSİM</th><th>KULLANICI ADI</th><th>ROL</th><th>DURUM</th></tr></thead>
                   <tbody>
                      {users.map(u => (
                         <tr key={u.id}><td>{u.full_name}</td><td>{u.username}</td><td><span className="badge">{u.role}</span></td><td><span className="status-ok">AKTİF</span></td></tr>
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
                         <tr key={a.id}><td>{a.condition_type}</td><td>{a.threshold_val}</td><td>{a.telegram_enabled ? 'EVET' : 'HAYIR'}</td><td><span className="status-ok">ÇALIŞIYOR</span></td></tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       )}

       {settingsTab === 'PRINTER' && (
          <div className="settings-panel">
             <h3><Receipt size={24}/> FİŞ VE YAZICI AYARLARI</h3>
             <div className="s-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div className="s-row"><label>FİŞ BAŞLIĞI</label><input value={printerConfig.header} onChange={e=>setPrinterConfig({...printerConfig, header: e.target.value})} /></div>
                <div className="s-row"><label>FİŞ ALTBİLGİ (FOOTER)</label><input value={printerConfig.footer} onChange={e=>setPrinterConfig({...printerConfig, footer: e.target.value})} /></div>
             </div>
             <hr style={{margin:'20px 0', border:'0', borderBottom:'1px solid #1e293b'}} />
             <h4><Database size={18}/> AĞ YAZICISI (TCP/IP)</h4>
             <div className="s-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div className="s-row"><label>YAZICI IP ADRESİ</label><input value={printerConfig.ip} onChange={e=>setPrinterConfig({...printerConfig, ip: e.target.value})} /></div>
                <div className="s-row"><label>PORT</label><input value={printerConfig.port} onChange={e=>setPrinterConfig({...printerConfig, port: e.target.value})} /></div>
             </div>
             <button className="btn-save" style={{marginTop:'20px'}} onClick={onSavePrinter}>YAZICIYI TEST ET VE KAYDET</button>
          </div>
       )}

       {settingsTab === 'RATES' && (
          <div className="settings-panel">
             <h3><Activity size={24}/> KUR VE MAKAS YÖNETİMİ</h3>
             <div className="s-row"><label>GLOBAL MAKAS (SPREAD)</label><input type="number" value={rateSpread} onChange={e=>setRateSpread(parseInt(e.target.value))} /></div>
             <button className="btn-save" onClick={onSaveSpread}>KUR AYARLARINI GÜNCELLE</button>
          </div>
       )}
    </div>
  );
};

export default SettingsPage;
