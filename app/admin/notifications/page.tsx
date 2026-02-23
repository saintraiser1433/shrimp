import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ScrollToHighlight } from "@/components/scroll-to-highlight";
import { ToastActionButton } from "@/components/toast-action-button";
import { markNotificationRead, markAllNotificationsReadForSession } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; highlight?: string }> | { page?: string; pageSize?: string; highlight?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const highlightId = params?.highlight;

  const where = { userId: session.user.id };

  if (highlightId) {
    const target = await prisma.notification.findFirst({
      where: { ...where, id: highlightId },
      select: { createdAt: true },
    });
    if (target) {
      const newerCount = await prisma.notification.count({
        where: { ...where, createdAt: { gt: target.createdAt } },
      });
      const pageForHighlight = Math.ceil((newerCount + 1) / pageSize);
      if (pageForHighlight !== page) {
        const q = new URLSearchParams();
        q.set("page", String(pageForHighlight));
        q.set("highlight", highlightId);
        if (pageSize !== DEFAULT_PAGE_SIZE) q.set("pageSize", String(pageSize));
        redirect(`/admin/notifications?${q.toString()}`);
      }
    }
  }

  const [notifications, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);

  return (
    <>
      <ScrollToHighlight highlightId={highlightId} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadForSession}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Message</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <DataTableEmpty message="No notifications yet." />
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr
                      key={n.id}
                      id={`notification-${n.id}`}
                      className={cn(
                        "border-b",
                        !n.read && "bg-muted/50",
                        highlightId === n.id && "bg-primary/20 ring-2 ring-primary/50 ring-inset"
                      )}
                    >
                      <td className="py-2 font-medium">{n.type}</td>
                      <td className="py-2">{n.message}</td>
                      <td className="py-2 text-muted-foreground text-sm">
                        {new Date(n.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {!n.read && (
                          <ToastActionButton
                            action={markNotificationRead}
                            actionArg={n.id}
                            successMessage="Marked as read"
                            errorMessage="Failed to mark as read"
                            variant="ghost"
                            size="sm"
                          >
                            Mark read
                          </ToastActionButton>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DataTablePagination totalCount={totalCount} currentPage={page} pageSize={pageSize} />
        </CardContent>
      </Card>
    </>
  );
}
