export type Role = 'MASTER_ADMIN' | 'ADMIN' | 'USER';

export interface User { 
  id: string; 
  full_name: string; 
  username: string; 
  role: Role; 
  nfc_enabled: boolean; 
}

export interface Rate { 
  pair: string; 
  baseFlag: string; 
  targetFlag: string; 
  buy: number; 
  sell: number; 
  flash: 'none'|'up'|'down'; 
}

export interface Customer { 
  id: string; 
  full_name: string; 
  identity_number: string; 
  phone: string; 
  customer_type: 'INDIVIDUAL'|'CORPORATE'; 
  tax_id?: string; 
  tax_office?: string; 
  authorized_persons?: any[]; 
  country?: string; 
  address?: string;
}

export interface Transaction { 
  id: string; 
  created_at: string; 
  user_name: string; 
  type: string; 
  debit_amount: number; 
  currency: string; 
  status: string; 
  customer_name: string; 
  customer_id: string; 
  credit_amount: number; 
  credit_currency?: string; 
}
