import React from 'react';
import { Settings } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User;
  weather: { location?: string; current: string };
  time: string;
  view: string;
  setView: (view: any) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, weather, time, view, setView, onLogout }) => {
  return (
    <header className="header">
       <div className="h-left" onClick={() => setView('EXCHANGE')} style={{cursor:'pointer'}}>
          <div className="logo">VALO</div>
       </div>
       <div className="h-center">
          <div className="weather-top"><span>{weather.location || 'FATİH'}</span><strong>{weather.current}</strong></div>
          {time}
       </div>
       <div className="h-right">
          <nav className="nav">
             <button onClick={() => setView('EXCHANGE')} className={view==='EXCHANGE'?'active':''}>GİŞE</button>
             <button onClick={() => setView('VAULT')} className={view==='VAULT'?'active':''}>KASA</button>
             <button onClick={() => setView('REPORTS')} className={view==='REPORTS'?'active':''}>İŞLEMLER</button>
             <button onClick={() => setView('CUSTOMERS')} className={view==='CUSTOMERS'?'active':''}>MÜŞTERİ</button>
             {user.role === 'MASTER_ADMIN' && <button onClick={() => setView('SETTINGS')} className={view==='SETTINGS'?'active':''}><Settings size={18}/></button>}
          </nav>
          <div className="u-box"><strong>{user.full_name.toUpperCase()}</strong><br/><span>{user.role}</span></div>
          <button onClick={onLogout} className="btn-exit">ÇIKIŞ</button>
       </div>
    </header>
  );
};

export default Header;
