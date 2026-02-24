import { create } from 'zustand';
import type { ClientInfo, PronoteCredentials } from '../../types/pronote';

interface AuthStore {
  isAuthenticated: boolean;
  credentials: PronoteCredentials | null;
  clientInfo: ClientInfo | null;
  isLoading: boolean;
  error: string | null;
  setAuthenticated: (value: boolean) => void;
  setCredentials: (creds: PronoteCredentials | null) => void;
  setClientInfo: (info: ClientInfo | null) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  credentials: null,
  clientInfo: null,
  isLoading: false,
  error: null,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setCredentials: (creds) => set({ credentials: creds }),
  setClientInfo: (info) => set({ clientInfo: info }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),
  logout: () => set({
    isAuthenticated: false,
    credentials: null,
    clientInfo: null,
    error: null,
  }),
}));
