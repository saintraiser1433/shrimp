"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationBellProps = {
  href: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
};

export function NotificationBell({
  href,
  unreadCount = 0,
  notifications = [],
}: NotificationBellProps) {
  const pathname = usePathname();
  const isOnNotificationsPage = pathname === href;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9",
            isOnNotificationsPage && "bg-primary/15 text-primary ring-2 ring-primary/50"
          )}
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-muted-foreground text-sm">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link
                href={`${href}?highlight=${n.id}`}
                className="block cursor-pointer py-2"
              >
                <div className={cn("font-medium", !n.read && "text-foreground")}>
                  {n.type}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {n.message}
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={href} className="cursor-pointer justify-center font-medium">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
