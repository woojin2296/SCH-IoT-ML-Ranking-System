"use client";

import * as React from "react";
import Image from "next/image";
import {
  ClipboardListIcon,
  FileCodeIcon,
  HomeIcon,
  MegaphoneIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  main: [
    {
      name: "홈 화면으로",
      url: "/",
      icon: HomeIcon,
    },
    {
      name: "유저 관리",
      url: "/admin/users",
      icon: UsersIcon,
    },
    {
      name: "공지 관리",
      url: "/admin/notices",
      icon: MegaphoneIcon,
    },
  ],
  score: [
    {
      name: "랭킹 관리",
      url: "/admin/rankings",
      icon: StarIcon,
    },
    {
      name: "제출 점수 관리",
      url: "/admin/scores",
      icon: ClipboardListIcon,
    },
  ],
  log: [
    {
      name: "요청 로그",
      url: "/admin/request-logs",
      icon: FileCodeIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Image
                src="/schiot_logo.png"
                alt="SCH Logo"
                width={100}
                height={0}
                priority
              />
              <span className="text-base font-semibold">관리자 페이지</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarMenu>
            {data.main.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Score</SidebarGroupLabel>
          <SidebarMenu>
            {data.score.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Log</SidebarGroupLabel>
          <SidebarMenu>
            {data.log.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
