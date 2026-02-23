"use client";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { NavMainItem } from "@/components/nav-main";

type DashboardLayoutProps = {
  navItems: NavMainItem[];
  user: { name: string | null; email: string; image?: string | null };
  children: React.ReactNode;
  /** When set, show notification bell in header with dropdown; click opens dropdown. */
  notificationHref?: string;
  notificationUnreadCount?: number;
  /** Recent notifications to show in the bell dropdown (plain serializable only). */
  notificationItems?: NotificationItem[];
};

export function DashboardLayout({
  navItems,
  user,
  children,
  notificationHref,
  notificationUnreadCount = 0,
  notificationItems = [],
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        navItems={navItems}
        user={{
          name: user.name || "User",
          email: user.email,
          avatar: user.image,
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <DynamicBreadcrumb />
          </div>
          <div className="flex items-center gap-1 px-4">
            <ThemeToggle />
            {notificationHref != null && (
              <NotificationBell
                href={notificationHref}
                unreadCount={notificationUnreadCount}
                notifications={notificationItems}
              />
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
