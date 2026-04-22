import React from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { Transaction } from '../../types';

interface ReportsPageProps {
  transactions: Transaction[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ transactions }) => {
  return (
    <div className="page">
       <div className="page-header">
          <h2><FileSpreadsheet size={24}/> SON İŞLEMLER</h2>
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={18}/> PDF / YAZDIR</button>
       </div>
       <div className="table-wrap">
          <table className="valo-table">
             <thead>
                <tr><th>TARİH</th><th>MÜŞTERİ</th><th>OPERATÖR</th><th>TİP</th><th>ALINAN</th><th>VERİLEN</th><th>DURUM</th></tr>
             </thead>
             <tbody>
                {transactions.map(t => (
                   <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleString('tr-TR')}</td>
                      <td>{t.customer_name || 'ANONİM'}</td>
                      <td>{t.user_name}</td>
                      <td><span className="badge">{t.type}</span></td>
                      <td><strong>{(t.debit_amount/100).toLocaleString('tr-TR')} {t.currency}</strong></td>
                      <td><strong style={{color:'#10b981'}}>{(t.credit_amount/100).toLocaleString('tr-TR')} {t.credit_currency || 'TRY'}</strong></td>
                      <td><span className="status-ok">TAMAMLANDI</span></td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default ReportsPage;
