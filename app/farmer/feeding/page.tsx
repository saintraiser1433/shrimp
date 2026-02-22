import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { ConfirmFeedingForm } from "@/components/confirm-feeding-form";
import { markMissedFeedingsAndNotify } from "@/lib/notifications";

export default async function FarmerFeedingPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  await markMissedFeedingsAndNotify();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const schedules = await prisma.feedingSchedule.findMany({
    where: {
      scheduledAt: { gte: todayStart, lt: weekEnd },
      status: "PENDING",
    },
    include: { pond: true, feed: true },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <>
      <h1 className="text-2xl font-bold">Feeding</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming feedings (dispense & confirm)</CardTitle>
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
                  <th className="pb-2 font-medium">Confirm</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <DataTableEmpty message="No pending feedings in the next 7 days." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b align-top">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">
                        <ConfirmFeedingForm
                          scheduleId={s.id}
                          defaultQuantity={s.quantity.toString()}
                        />
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
