import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { CreateFeedingScheduleModal } from "@/components/modals/create-feeding-schedule-modal";
import { markMissedFeedingsAndNotify } from "@/lib/notifications";

export default async function AdminFeedingSchedulesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  await markMissedFeedingsAndNotify();

  const [schedules, ponds, feeds, farmers] = await Promise.all([
    prisma.feedingSchedule.findMany({
      include: { pond: true, feed: true, assignedFarmer: true },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
    prisma.pond.findMany({ orderBy: { name: "asc" } }),
    prisma.feedsInventory.findMany({ include: { unit: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "FARMER" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feeding Schedules</h1>
        <CreateFeedingScheduleModal
          ponds={ponds.map((p) => ({ id: p.id, name: p.name }))}
          feeds={feeds.map((f) => ({ id: f.id, name: f.name }))}
          farmers={farmers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No feeding schedules yet." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">{s.status}</td>
                      <td className="py-2 text-muted-foreground">
                        {s.assignedFarmer ? s.assignedFarmer.name || s.assignedFarmer.email : "—"}
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
