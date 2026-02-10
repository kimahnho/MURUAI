import { ShieldAlert } from "lucide-react";

const UnauthorizedView = ({
  email,
  onSignOut,
}: {
  email: string | null;
  onSignOut: () => void;
}) => {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-3xl border border-black-10 bg-white-100 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-title-18-semibold text-black-100">
              접근 권한이 없어요
            </span>
            <span className="text-12-regular text-black-50">
              관리자 권한이 있는 계정으로만 접근할 수 있어요.
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-black-10 bg-black-5 px-4 py-3 text-14-regular text-black-70">
          현재 로그인한 계정: {email ?? "알 수 없음"}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="h-11 rounded-2xl bg-black-90 text-title-16-semibold text-white-100 hover:bg-black-100"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedView;
