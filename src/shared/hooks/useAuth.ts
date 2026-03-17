import { useState } from "react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/shared/api/supabase";
import { mp } from "@/shared/utils/mixpanel";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      mp.track("Google 로그인");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google 로그인 실패");
      console.error("Google login error:", err);
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithKakao = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      mp.track("카카오 로그인");
    } catch (err) {
      setError(err instanceof Error ? err.message : "카카오 로그인 실패");
      console.error("Kakao login error:", err);
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "이메일 로그인 실패");
      console.error("Email login error:", err);
      Sentry.captureException(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;
      mp.track("이메일 가입");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
      console.error("Signup error:", err);
      Sentry.captureException(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그아웃 실패");
      console.error("Signout error:", err);
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    signInWithGoogle,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
};
