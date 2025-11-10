import { getAllNotices } from "@/lib/services/noticeService";
import NoticeRow from "./NoticeRow";

export default function AdminNoticesPage() {
  const notices = getAllNotices();
  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">공지 관리</h2>
        <p className="text-sm text-neutral-500">공지 생성, 수정, 활성/비활성 전환 및 삭제를 수행합니다.</p>
      </div>
      <div className="px-4 lg:px-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm rounded-md border">
          <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">메시지</th>
              <th className="px-4 py-3">활성</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            <NewNoticeForm />
            {notices.map((n) => (
              <NoticeRow key={n.id} notice={n} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewNoticeForm() {
  return <NoticeRow isNew notice={{ id: 0, message: "", isActive: true, createdAt: "", updatedAt: "" }} />;
}
