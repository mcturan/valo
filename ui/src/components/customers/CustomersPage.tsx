import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Customer } from '../../types';

interface CustomersPageProps {
  customers: Customer[];
  onNewCustomer: () => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ customers, onNewCustomer }) => {
  return (
    <div className="page">
       <div className="page-header">
          <h2><Users size={24}/> MÜŞTERİ PORTFÖYÜ</h2>
          <button className="btn-primary" onClick={onNewCustomer}><UserPlus size={18}/> YENİ MÜŞTERİ</button>
       </div>
       <div className="table-wrap">
          <table className="valo-table">
             <thead>
                <tr><th>AD SOYAD / ÜNVAN</th><th>TC / PASAPORT</th><th>ÜLKE</th><th>TELEFON</th><th>DURUM</th></tr>
             </thead>
             <tbody>
                {customers.map(c => (
                   <tr key={c.id} onClick={()=>{}} style={{cursor:'pointer'}}>
                      <td><strong>{c.full_name}</strong></td>
                      <td>{c.identity_number}</td>
                      <td>{c.country || 'TÜRKİYE'}</td>
                      <td>{c.phone}</td>
                      <td><span className="status-ok">AKTİF</span></td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default CustomersPage;
