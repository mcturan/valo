import React from 'react';
import { X, Camera, ShieldCheck, UserPlus } from 'lucide-react';
import { Customer } from '../../types';

interface KYCModalProps {
  customers: Customer[];
  onSelect: (c: Customer) => void;
  onClose: () => void;
  onOCR: (file: File) => void;
  onRegister: (payload: any) => void;
}

const KYCModal: React.FC<KYCModalProps> = ({ customers, onSelect, onClose, onOCR, onRegister }) => {
  return (
    <div className="modal-bg">
      <div className="modal">
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
           <h2>MÜŞTERİ SEÇİMİ / YENİ KAYIT</h2>
           <button className="icon-btn" onClick={onClose}><X/></button>
        </div>
        
        <div className="modal-grid">
           <div className="m-section">
              <div className="ocr-zone" onClick={() => {
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = 'image/*';
                 input.onchange = async (e) => {
                    const file = (e.target as any).files[0];
                    if (file) onOCR(file);
                 };
                 input.click();
              }}><Camera size={32}/><br/>KİMLİK TARA (OCR)</div>
              <div className="m-list">
                 {customers.map(c=>(
                    <div key={c.id} className="m-item" onClick={()=>onSelect(c)}>
                       <strong>{c.full_name}</strong>
                       <span style={{fontSize:'0.7rem', color:'#64748b', display:'block'}}>{c.identity_number}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="m-section form-section">
              <h3>HIZLI KAYIT</h3>
              <form id="kyc-form" onSubmit={(e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const payload = Object.fromEntries(fd.entries());
                 onRegister(payload);
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
    </div>
  );
};

export default KYCModal;
