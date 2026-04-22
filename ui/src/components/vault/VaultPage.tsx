import React from 'react';
import { Wallet, Send, TrendingDown } from 'lucide-react';

interface VaultPageProps {
  vaultStatus: any;
  balances: any[];
  onTransfer: (payload: any) => Promise<void>;
  onCloseDay: () => void;
}

const VaultPage: React.FC<VaultPageProps> = ({ vaultStatus, balances, onTransfer, onCloseDay }) => {
  return (
    <div className="page">
       <div className="page-header">
          <h2><Wallet size={24}/> KASA İŞLEMLERİ</h2>
          <div className="page-actions">
             <span className={`status-badge ${vaultStatus?.isOpen ? 'open' : 'closed'}`}>
                {vaultStatus?.isOpen ? 'KASA AÇIK' : 'KASA KAPALI'}
             </span>
          </div>
       </div>
       
       <div className="s-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}>
          <div className="settings-panel">
             <h3><Send size={20}/> ANA KASADAN PARA AL</h3>
             <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const payload = { amount: parseInt(fd.get('amount') as string) * 100, currency: fd.get('currency'), direction: 'FROM_MASTER' };
                await onTransfer(payload);
                e.currentTarget.reset();
             }}>
                <div className="s-row"><label>BİRİM</label><select name="currency"><option>TRY</option><option>USD</option><option>EUR</option></select></div>
                <div className="s-row"><label>TUTAR</label><input name="amount" type="number" required /></div>
                <button type="submit" className="btn-primary" style={{width:'100%', justifyContent:'center'}}>TRANSFERİ ONAYLA</button>
             </form>
          </div>

          <div className="settings-panel">
             <h3><TrendingDown size={20}/> GÜN SONU / KASA KAPANIŞI</h3>
             <div className="k-list" style={{margin:'20px 0'}}>
                {balances.map(b => (
                   <div key={b.currency_code} className="k-row">
                      <span>{b.currency_code}</span>
                      <strong>{(Number(b.balance)/100).toLocaleString('tr-TR')}</strong>
                   </div>
                ))}
             </div>
             <button className="btn-secondary" style={{width:'100%', color:'#ef4444', borderColor:'#ef4444'}} onClick={onCloseDay}>GÜNÜ KAPAT VE DEVRET</button>
          </div>
       </div>
       <style>{`
          .status-badge { padding:8px 16px; border-radius:100px; font-weight:900; font-size:0.7rem; letter-spacing:1px; }
          .status-badge.open { background:rgba(16,185,129,0.1); color:#10b981; border:1px solid #10b981; }
          .status-badge.closed { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid #ef4444; }
       `}</style>
    </div>
  );
};

export default VaultPage;
