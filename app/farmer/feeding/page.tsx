import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ConfirmFeedingForm } from "@/components/confirm-feeding-form";
import { markMissedFeedingsAndNotify } from "@/lib/notifications";
import { refreshSchedulesForAllActiveStockings } from "@/lib/actions/pond-stockings";

const DEFAULT_PAGE_SIZE = 10;

export default async function FarmerFeedingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }> | { page?: string; pageSize?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  await markMissedFeedingsAndNotify();
  await refreshSchedulesForAllActiveStockings();

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingWhere = {
    assignedFarmerId: session.user.id,
    scheduledAt: { gte: todayStart, lt: weekEnd },
    status: "PENDING",
  };
  const missedWhere = { assignedFarmerId: session.user.id, status: "MISSED" };
  const delayedWhere = { assignedFarmerId: session.user.id, status: "DELAYED" };
  const calendarEnd = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [schedules, totalCount, delayed, missed, calendarSchedules, todaySessions] =
    await Promise.all([
    prisma.feedingSchedule.findMany({
      where: upcomingWhere,
      include: { pond: true, feed: true, shrimpType: true },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedingSchedule.count({ where: upcomingWhere }),
    prisma.feedingSchedule.findMany({
      where: delayedWhere,
      include: { pond: true, feed: true, shrimpType: true },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    prisma.feedingSchedule.findMany({
      where: missedWhere,
      include: { pond: true, feed: true, shrimpType: true },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    prisma.feedingSchedule.findMany({
      where: {
        assignedFarmerId: session.user.id,
        scheduledAt: { gte: todayStart, lt: calendarEnd },
      },
      include: {
        pond: true,
        feed: true,
        shrimpType: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    }),
    prisma.feedingSchedule.findMany({
      where: {
        assignedFarmerId: session.user.id,
        scheduledAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) },
      },
      select: { status: true },
    }),
  ]);

  const todayCompleted = todaySessions.filter((r) => r.status === "COMPLETED").length;
  const todayTotal = todaySessions.length;

  return (
    <>
      <h1 className="text-2xl font-bold">Feeding</h1>
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s feeding progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {todayTotal === 0
              ? "No feeding sessions are scheduled for you today."
              : `${todayCompleted} of ${todayTotal} scheduled session${todayTotal === 1 ? "" : "s"} completed today (each row is one session).`}
          </p>
        </CardContent>
      </Card>
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
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Growth stage</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Confirm</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <DataTableEmpty message="No pending feedings in the next 7 days." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b align-top">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{s.growthStageName || "—"}</td>
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
          <DataTablePagination totalCount={totalCount} currentPage={page} pageSize={pageSize} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Delayed feedings{" "}
            {delayed.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {delayed.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-xs">
            These are past the scheduled time but still within the grace window. Complete them now so
            they are not marked missed.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Growth stage</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Confirm</th>
                </tr>
              </thead>
              <tbody>
                {delayed.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <DataTableEmpty message="No delayed feedings." />
                    </td>
                  </tr>
                ) : (
                  delayed.map((s) => (
                    <tr key={s.id} className="border-b align-top">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{s.growthStageName || "—"}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">
                        <ConfirmFeedingForm
                          scheduleId={s.id}
                          defaultQuantity={s.quantity.toString()}
                          isLate
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

      <Card>
        <CardHeader>
          <CardTitle>
            Missed feedings{" "}
            {missed.length > 0 ? (
              <Badge variant="destructive" className="ml-2">
                {missed.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-xs">
            These passed the delayed grace period. You can still mark them as fed (late) — please add
            a short reason. The system will record it as late and update the feed inventory.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Growth stage</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Mark as fed (late)</th>
                </tr>
              </thead>
              <tbody>
                {missed.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <DataTableEmpty message="No missed feedings. Keep it up!" />
                    </td>
                  </tr>
                ) : (
                  missed.map((s) => (
                    <tr key={s.id} className="border-b align-top">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{s.growthStageName || "—"}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">
                        <ConfirmFeedingForm
                          scheduleId={s.id}
                          defaultQuantity={s.quantity.toString()}
                          isLate
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

      <Card>
        <CardHeader>
          <CardTitle>Feeding stage calendar (next 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3 text-xs">
            Use this as your day-by-day checklist. A completed item is marked with a check.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Check</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Growth stage</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {calendarSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <DataTableEmpty message="No feeding schedules for the next 14 days." />
                    </td>
                  </tr>
                ) : (
                  calendarSchedules.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2">
                        {s.status === "COMPLETED" ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border bg-emerald-100 text-emerald-700">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border text-muted-foreground">
                            {s.status === "MISSED" || s.status === "DELAYED" ? "!" : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{s.growthStageName || "—"}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">
                        {s.status === "COMPLETED" ? (
                          <Badge variant="secondary">Finished</Badge>
                        ) : s.status === "MISSED" ? (
                          <Badge variant="destructive">Missed</Badge>
                        ) : s.status === "DELAYED" ? (
                          <Badge variant="secondary">Delayed</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
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
