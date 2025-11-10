import { projects } from "@/lib/projects";
import type { AdminRankingRecord } from "@/lib/services/scoreService";
import { Button } from "@/components/ui/button";
import AdminRankingRow from "./AdminRankingRow";

type AdminRankingsPageProps = {
  projectNumber: number;
  selectedYear: number;
  availableYears: number[];
  records: AdminRankingRecord[];
};

export default function AdminRankingsPage({
  projectNumber,
  selectedYear,
  availableYears,
  records,
}: AdminRankingsPageProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 py-6">
        <div className="px-4 lg:px-6 space-y-2">
          <h2 className="text-lg font-semibold">랭킹 관리</h2>
          <p className="text-sm text-neutral-500">
            선택한 프로젝트와 연도의 상위 점수를 확인하고 필요 시 기록을 삭제할 수 있습니다.
          </p>
        </div>
        <div className="px-4 lg:px-6">
          <form className="flex flex-wrap items-end gap-4" action="/admin/rankings" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="projectSelect" className="text-sm font-medium text-neutral-700">
                프로젝트
              </label>
              <select
                id="projectSelect"
                name="project"
                defaultValue={String(projectNumber)}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
              >
                {projects.map((project) => (
                  <option key={project.number} value={project.number}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="yearSelect" className="text-sm font-medium text-neutral-700">
                연도
              </label>
              <select
                id="yearSelect"
                name="year"
                defaultValue={String(selectedYear)}
                className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="bg-[#265392] text-white">
              필터 적용
            </Button>
          </form>
        </div>
        <div className="px-4 lg:px-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 bg-white text-sm rounded-md border">
            <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 text-center">순위</th>
                <th className="px-4 py-3">점수</th>
                <th className="px-4 py-3">프로젝트</th>
                <th className="px-4 py-3">학번</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">Public ID</th>
                <th className="px-4 py-3">년도</th>
                <th className="px-4 py-3">제출 일시</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-sm text-neutral-500">
                    선택된 조건에 해당하는 랭킹 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                records.map((record) => <AdminRankingRow key={record.id} record={record} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
