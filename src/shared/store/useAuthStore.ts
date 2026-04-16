import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

export type UserRole = "user" | "admin" | "tester";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  termsAccepted: boolean | null; // null = 로딩 중, true = 동의 완료, false = 미동의
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setTermsAccepted: (accepted: boolean | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  termsAccepted: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    { set({
      user,
      isAuthenticated: !!user,
      ...(user ? {} : { role: null, termsAccepted: null }),
    }); },
  setRole: (role) => { set({ role }); },
  setTermsAccepted: (termsAccepted) => { set({ termsAccepted }); },
  setLoading: (isLoading) => { set({ isLoading }); },
}));
