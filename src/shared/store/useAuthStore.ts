import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

export type UserRole = "user" | "admin";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    { set({
      user,
      isAuthenticated: !!user,
      ...(user ? {} : { role: null }),
    }); },
  setRole: (role) => { set({ role }); },
  setLoading: (isLoading) => { set({ isLoading }); },
}));
