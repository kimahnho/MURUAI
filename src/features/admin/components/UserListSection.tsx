/**
 * 관리자 유저 목록 섹션 — 검색, 유저 정보 표시.
 */
import { useState } from "react";
import { Search } from "lucide-react";
import Badge from "@/shared/ui/Badge";
import Spinner from "@/shared/ui/Spinner";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { EXCLUDED_USER_IDS } from "../constants/excludedUsers";

const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const providerLabel = (provider: string) => {
  if (provider === "google") return "Google";
  if (provider === "kakao") return "카카오";
  return "이메일";
};

const UserListSection = () => {
  const { users, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");

  const filteredUsers = users
    .filter((u) => !EXCLUDED_USER_IDS.has(u.id))
    .filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q)
      );
    });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 + 유저 수 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-70" />
          <input
            type="text"
            placeholder="이메일 또는 이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-14-regular text-black-90 placeholder:text-black-40 focus:border-primary-300 focus:outline-none"
          />
        </div>
        <span className="shrink-0 text-13-regular text-black-70">
          총 {filteredUsers.length}명
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-black-5">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">이메일</th>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">이름</th>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">로그인</th>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">마지막 접속</th>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">가입일</th>
              <th className="whitespace-nowrap px-4 py-3 text-12-semibold text-black-70">역할</th>
              <th className="whitespace-nowrap px-4 py-3 text-center text-12-semibold text-black-70" colSpan={3}>
                크레딧
              </th>
            </tr>
            <tr className="border-b border-slate-200 bg-black-5">
              <th colSpan={6} />
              <th className="whitespace-nowrap px-3 py-1.5 text-12-regular text-black-70">잔여</th>
              <th className="whitespace-nowrap px-3 py-1.5 text-12-regular text-black-70">누적</th>
              <th className="whitespace-nowrap px-3 py-1.5 text-12-regular text-black-70">리필</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-black-5 transition">
                <td className="whitespace-nowrap px-4 py-3 text-13-regular text-black-80">
                  {user.email}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-13-regular text-black-70">
                  {user.display_name || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="rounded-md bg-black-5 px-2 py-0.5 text-12-regular text-black-70">
                    {providerLabel(user.provider)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-12-regular text-black-70">
                  {formatDateTime(user.last_sign_in_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-12-regular text-black-70">
                  {formatDate(user.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {user.role === "admin" ? (
                    <Badge variant="primary">관리자</Badge>
                  ) : (
                    <span className="text-12-regular text-black-70">유저</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-center text-13-bold text-black-70">
                  {user.credit_balance}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-center text-13-regular text-black-70">
                  {user.credit_total_used}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-center text-13-regular text-black-70">
                  {user.credit_refill_count}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-13-regular text-black-70"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserListSection;
