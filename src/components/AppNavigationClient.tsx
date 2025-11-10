"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function AppNavigationClient({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const year = searchParams.get("year");

  const base = "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition";
  const active = "bg-[#265392] text-white shadow";
  const inactive = "bg-neutral-100 text-neutral-700 hover:bg-neutral-200";

  const isCurrentActive = pathname === "/" && !year;
  const isPastActive = pathname.startsWith("/rankings");
  const isMyResultsActive = pathname.startsWith("/mypage/results");
  const isAccountActive = pathname.startsWith("/mypage/account");
  const isAdminActive = pathname.startsWith("/admin");

  return (
    <nav className="w-full">
      <ul className="mx-auto flex w-full max-w-3xl flex-wrap justify-center items-center gap-2">
        <li>
          <Link href="/" className={`${base} ${isCurrentActive ? active : inactive}`}>
            현재 랭킹
          </Link>
        </li>
        <li>
          <Link href={`/rankings`} className={`${base} ${isPastActive ? active : inactive}`}>
            전체 랭킹
          </Link>
        </li>
        <li>
          <Link href="/mypage/results" className={`${base} ${isMyResultsActive ? active : inactive}`}>
            내 결과 관리
          </Link>
        </li>
        <li>
          <Link href="/mypage/account" className={`${base} ${isAccountActive ? active : inactive}`}>
            내 계정
          </Link>
        </li>
        {isAdmin ? (
          <li>
            <Link href="/admin/users" className={`${base} ${isAdminActive ? active : "bg-yellow-400 text-neutral-900 hover:bg-yellow-500"}`}> 
              관리자 페이지
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
