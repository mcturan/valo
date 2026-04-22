import React from 'react';
import { Cpu } from 'lucide-react';

interface DenomModalProps {
  amount: string;
  baseCurrency: string;
  onConfirm: () => void;
}

const DenomModal: React.FC<DenomModalProps> = ({ amount, baseCurrency, onConfirm }) => {
  return (
    <div className="modal-bg">
      <div className="modal" style={{maxWidth:'500px', textAlign:'center'}}>
        <Cpu size={48} color="#fbbf24" style={{marginBottom:'20px'}}/>
        <h2>KUPÜR GİRİŞİ / SAYIM</h2>
        <p style={{color:'#64748b'}}>Donanımdan gelen sayım verileri bekleniyor...</p>
        
        <div style={{padding:'20px', background:'rgba(255,255,255,0.05)', borderRadius:'12px', margin:'20px 0'}}>
           <div style={{fontSize:'0.8rem', color:'#64748b'}}>SAYILAN TUTAR</div>
           <div style={{fontSize:'2.5rem', fontWeight:'900', color:'#fbbf24'}}>{amount || '0.00'} {baseCurrency}</div>
        </div>

        <button className="btn-confirm" onClick={onConfirm}>TAMAMLA VE YAZDIR (F10)</button>
      </div>
    </div>
  );
};

export default DenomModal;
