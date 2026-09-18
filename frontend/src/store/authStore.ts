import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'district_manager';
  status: 'active' | 'inactive';
  dmid: string;
  is_2fa_enabled: boolean;
  is_demo_creds: boolean;
  must_change_password?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tempToken: string | null; // Used during Supabase 2FA verification step
  mfaRequired: boolean;
  setAuth: (user: User, token: string) => void;
  setTempToken: (token: string) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
}

const initialToken = localStorage.getItem('eod_access_token');
const initialUserStr = localStorage.getItem('eod_user_data');
let initialUser: User | null = null;
if (initialUserStr) {
  try {
    initialUser = JSON.parse(initialUserStr);
  } catch {
    initialUser = null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  tempToken: null,
  mfaRequired: false,

  setAuth: (user: User, token: string) => {
    localStorage.setItem('eod_access_token', token);
    localStorage.setItem('eod_user_data', JSON.stringify(user));
    set({ user, token, tempToken: null, mfaRequired: false });
  },

  setTempToken: (token: string) => {
    set({ tempToken: token, mfaRequired: true });
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...userData };
      localStorage.setItem('eod_user_data', JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: () => {
    localStorage.removeItem('eod_access_token');
    localStorage.removeItem('eod_user_data');
    set({ user: null, token: null, tempToken: null, mfaRequired: false });
  },
}));
