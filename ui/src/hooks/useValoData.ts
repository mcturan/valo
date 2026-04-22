import { useState, useEffect } from 'react';
import { Rate, Customer, Transaction } from '../types';

const INITIAL_RATES: Rate[] = [
  { pair: 'USD/TRY', baseFlag: '🇺🇸', targetFlag: '🇹🇷', buy: 321500, sell: 324500, flash: 'none' },
  { pair: 'EUR/TRY', baseFlag: '🇪🇺', targetFlag: '🇹🇷', buy: 345000, sell: 348500, flash: 'none' },
  { pair: 'GBP/TRY', baseFlag: '🇬🇧', targetFlag: '🇹🇷', buy: 402000, sell: 406000, flash: 'none' },
  { pair: 'XAU/TRY', baseFlag: '🪙', targetFlag: '🇹🇷', buy: 2350000, sell: 2380000, flash: 'none' },
];

export function useValoData(user: any, authFetch: any) {
  const [liveRates, setLiveRates] = useState<Rate[]>(INITIAL_RATES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<{currency_code: string, balance: string}[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [rateSpread] = useState(300);

  const loadData = async () => {
    if (!user) return;
    try {
      const [cRes, tRes, bRes, rRes, uRes, aRes] = await Promise.all([
        authFetch('/customers').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/transactions').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/system/balances').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/system/rates').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/system/users').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/system/alarms').catch(() => ({ ok: false, json: async () => [] }))
      ]);
      
      const safeJson = async (r: any) => {
        try { 
          if (!r.ok) return [];
          return await r.json(); 
        } catch (e) { return []; }
      };

      const c = await safeJson(cRes);
      const t = await safeJson(tRes);
      const b = await safeJson(bRes);
      const r = await safeJson(rRes);
      const us = await safeJson(uRes);
      const al = await safeJson(aRes);

      setCustomers(Array.isArray(c) ? c : []); 
      setTransactions(Array.isArray(t) ? t : []); 
      setBalances(Array.isArray(b) ? b : []);
      setUsers(Array.isArray(us) ? us : []);
      setAlarms(Array.isArray(al) ? al : []);
      
      if (Array.isArray(r) && r.length > 0) {
        const updatedRates = INITIAL_RATES.map(base => {
          const match = r.find((db: any) => `${db.base_currency}/${db.target_currency}` === base.pair);
          if (match) {
            return { ...base, buy: match.rate_multiplier, sell: match.rate_multiplier + rateSpread };
          }
          return base;
        });
        setLiveRates(updatedRates);
      }
    } catch (e) { console.error("Data load failed", e); }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  return { liveRates, transactions, customers, balances, users, alarms, loadData, INITIAL_RATES };
}
