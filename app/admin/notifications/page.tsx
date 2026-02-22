import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { ToastActionButton } from "@/components/toast-action-button";
import { markNotificationRead, markAllNotificationsReadForSession } from "@/lib/actions/notifications";

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
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
                    <tr key={n.id} className={`border-b ${!n.read ? "bg-muted/50" : ""}`}>
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
        </CardContent>
      </Card>
    </>
  );
}
