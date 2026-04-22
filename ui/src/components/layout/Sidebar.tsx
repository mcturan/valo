import React from 'react';
import { Wallet, Activity } from 'lucide-react';
import { Rate } from '../../types';

interface SidebarProps {
  balances: { currency_code: string; balance: string }[];
  liveRates: Rate[];
}

const Sidebar: React.FC<SidebarProps> = ({ balances, liveRates }) => {
  return (
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
           <div className="r-vals">
             <div><div className="lbl">ALIŞ</div><div className="buy">{(r.buy/10000).toFixed(4)}</div></div>
             <div><div className="lbl" style={{textAlign:'right'}}>SATIŞ</div><div className="sell">{(r.sell/10000).toFixed(4)}</div></div>
           </div>
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
