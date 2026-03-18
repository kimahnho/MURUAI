import { useState } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import { mp } from "@/shared/utils/mixpanel";

const AUTH_ERROR_MAP: Record<string, string> = {
  "Email not confirmed": "이메일 인증이 완료되지 않았어요. 메일함을 확인해 주세요.",
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않아요.",
  "User already registered": "이미 가입된 이메일이에요.",
  "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 해요.",
  "Signup requires a valid password": "유효한 비밀번호를 입력해 주세요.",
  "Unable to validate email address: invalid format": "올바른 이메일 형식을 입력해 주세요.",
};

const toKoreanError = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return AUTH_ERROR_MAP[err.message] ?? fallback;
  }
  return fallback;
};

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
      setError(toKoreanError(err, "Google 로그인에 실패했어요."));
      console.error("Google login error:", err);
      captureSentryError(err, "Google 로그인");
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
      setError(toKoreanError(err, "카카오 로그인에 실패했어요."));
      console.error("Kakao login error:", err);
      captureSentryError(err, "카카오 로그인");
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
      setError(toKoreanError(err, "이메일 로그인에 실패했어요."));
      console.error("Email login error:", err);
      captureSentryError(err, "이메일 로그인");
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
      setError(toKoreanError(err, "회원가입에 실패했어요."));
      console.error("Signup error:", err);
      captureSentryError(err, "이메일 가입");
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
      setError(toKoreanError(err, "로그아웃에 실패했어요."));
      console.error("Signout error:", err);
      captureSentryError(err, "로그아웃");
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
