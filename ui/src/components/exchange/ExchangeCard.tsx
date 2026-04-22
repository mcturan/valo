import React from 'react';
import { ShieldCheck, UserPlus, AlertTriangle } from 'lucide-react';
import { Customer } from '../../types';

interface ExchangeCardProps {
  selectedCustomer: Customer | null;
  setShowKYCModal: (show: boolean) => void;
  amount: string;
  setAmount: (amt: string) => void;
  baseCurrency: string;
  setBaseCurrency: (cur: string) => void;
  targetCurrency: string;
  setTargetCurrency: (cur: string) => void;
  riskInfo: { risk_level: string; reason: string } | null;
  formatCurrency: (val: number) => string;
  getRawResult: () => number;
  setShowDenomModal: (show: boolean) => void;
}

const ExchangeCard: React.FC<ExchangeCardProps> = ({
  selectedCustomer, setShowKYCModal, amount, setAmount,
  baseCurrency, setBaseCurrency, targetCurrency, setTargetCurrency,
  riskInfo, formatCurrency, getRawResult, setShowDenomModal
}) => {
  return (
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
  );
};

export default ExchangeCard;
