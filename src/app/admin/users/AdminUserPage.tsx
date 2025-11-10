import AdminUserRow from "./AdminUserRow";
import { findAllUsers } from "@/lib/repositories/userRepository";

export function AdminUserPage() {
  const users = findAllUsers();
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-6">
        <div className="px-4 lg:px-6">
          <h2 className="text-lg font-semibold">사용자 목록</h2>
          <p className="text-sm text-neutral-500">역할과 연도를 수정할 수 있습니다.</p>
        </div>
        <div className="px-4 lg:px-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm rounded-md border">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">학번</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">년도</th>
                <th className="px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {users.map((u) => (
                <AdminUserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
