import { useState } from "react";
import { Shield } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";

const AdminLoginView = () => {
  const { loading, error, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "로그인에 실패했어요."
      );
    }
  };

  const isSubmitDisabled =
    loading || !email.trim().length || !password.trim().length;

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-black-10 bg-white-100 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-title-18-semibold text-black-100">
              관리자 로그인
            </span>
            <span className="text-12-regular text-black-50">
              admin@muruai.com 계정만 접근할 수 있어요.
            </span>
          </div>
        </div>

        {(error || formError) && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-14-regular text-red-600">
            {formError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-13-regular text-black-70" htmlFor="admin-email">
              이메일
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); }}
              className="h-11 rounded-2xl border border-black-20 px-4 text-14-regular text-black-90 placeholder:text-black-50 focus:border-primary focus:outline-none"
              placeholder="admin@muruai.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-13-regular text-black-70"
              htmlFor="admin-password"
            >
              비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => { setPassword(event.target.value); }}
              className="h-11 rounded-2xl border border-black-20 px-4 text-14-regular text-black-90 placeholder:text-black-50 focus:border-primary focus:outline-none"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`mt-2 h-11 rounded-2xl text-title-16-semibold text-white-100 transition ${
              isSubmitDisabled
                ? "cursor-not-allowed bg-black-30"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading ? "로그인 중..." : "관리자 로그인"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginView;
