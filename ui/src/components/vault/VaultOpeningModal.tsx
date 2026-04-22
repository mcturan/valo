import React from 'react';
import { Wallet } from 'lucide-react';

interface VaultOpeningModalProps {
  onOpen: (balances: { TRY: number; USD: number }) => void;
}

const VaultOpeningModal: React.FC<VaultOpeningModalProps> = ({ onOpen }) => {
  return (
    <div className="modal-bg">
      <div className="modal" style={{maxWidth:'500px'}}>
        <div style={{textAlign:'center', marginBottom:'30px'}}>
          <Wallet size={64} color="#fbbf24" style={{marginBottom:'20px'}}/>
          <h2>GÜNLÜK KASA AÇILIŞI</h2>
          <p style={{color:'#64748b'}}>Güne başlamak için elinizdeki nakit mevcudunu doğrulayın.</p>
        </div>
        <div className="s-row"><label>TRY MEVCUT (ADET/TUTAR)</label><input type="number" defaultValue="0" id="open-try" style={{fontSize:'1.5rem'}} /></div>
        <div className="s-row"><label>USD MEVCUT (ADET/TUTAR)</label><input type="number" defaultValue="0" id="open-usd" style={{fontSize:'1.5rem'}} /></div>
        <button className="btn-confirm" style={{marginTop:'30px', borderRadius:'16px'}} onClick={() => {
            const tr = parseInt((document.getElementById('open-try') as HTMLInputElement).value) * 100;
            const us = parseInt((document.getElementById('open-usd') as HTMLInputElement).value) * 100;
            onOpen({ TRY: tr, USD: us });
        }}>KASAYI AÇ VE TERMİNALE BAĞLAN</button>
      </div>
    </div>
  );
};

export default VaultOpeningModal;
