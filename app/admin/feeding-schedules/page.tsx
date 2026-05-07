import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreateFeedingScheduleModal } from "@/components/modals/create-feeding-schedule-modal";
import { EditFeedingScheduleModal } from "@/components/modals/edit-feeding-schedule-modal";
import { deleteFeedingSchedule } from "@/lib/actions/feeding-schedules";
import { markMissedFeedingsAndNotify } from "@/lib/notifications";
import { refreshSchedulesForAllActiveStockings } from "@/lib/actions/pond-stockings";

const DEFAULT_PAGE_SIZE = 10;

function formatFeedTotal(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

export default async function AdminFeedingSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }> | { page?: string; pageSize?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  await markMissedFeedingsAndNotify();
  await refreshSchedulesForAllActiveStockings();

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

  const [schedules, totalCount, ponds, feeds, farmers, shrimpTypes, summarySchedules] = await Promise.all([
    prisma.feedingSchedule.findMany({
      include: {
        pond: true,
        feed: true,
        shrimpType: { include: { defaultFeedingUnit: true } },
        assignedFarmer: true,
        confirmations: {
          orderBy: { confirmedAt: "desc" },
          select: {
            isLate: true,
            lateReason: true,
            notes: true,
            confirmedAt: true,
            farmer: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedingSchedule.count(),
    prisma.pond.findMany({ orderBy: { name: "asc" } }),
    prisma.feedsInventory.findMany({ include: { unit: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "FARMER" }, orderBy: { name: "asc" } }),
    prisma.shrimpType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.feedingSchedule.findMany({
      include: {
        pond: true,
        shrimpType: true,
        confirmations: {
          select: {
            confirmedAt: true,
            dispensedQty: true,
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
    }),
  ]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const feedingPondSummary = Array.from(
    summarySchedules.reduce((map, schedule) => {
      const existing = map.get(schedule.pondId) ?? {
        pondId: schedule.pondId,
        pondName: schedule.pond.name,
        shrimpTypes: new Set<string>(),
        pendingCount: 0,
        totalFeedConsumed: 0,
        lastFed: null as Date | null,
        todayTotal: 0,
        todayCompleted: 0,
      };

      if (schedule.shrimpType?.name) {
        existing.shrimpTypes.add(schedule.shrimpType.name);
      }
      if (schedule.status === "PENDING" || schedule.status === "DELAYED") {
        existing.pendingCount += 1;
      }
      for (const confirmation of schedule.confirmations) {
        existing.totalFeedConsumed += Number(confirmation.dispensedQty);
        if (!existing.lastFed || confirmation.confirmedAt > existing.lastFed) {
          existing.lastFed = confirmation.confirmedAt;
        }
      }

      const schedAt = new Date(schedule.scheduledAt);
      if (schedAt >= todayStart && schedAt < todayEnd) {
        existing.todayTotal += 1;
        if (schedule.status === "COMPLETED") {
          existing.todayCompleted += 1;
        }
      }

      map.set(schedule.pondId, existing);
      return map;
    }, new Map<string, {
      pondId: string;
      pondName: string;
      shrimpTypes: Set<string>;
      pendingCount: number;
      totalFeedConsumed: number;
      lastFed: Date | null;
      todayTotal: number;
      todayCompleted: number;
    }>())
  ).map(([, summary]) => ({
    ...summary,
    shrimpTypes: Array.from(summary.shrimpTypes),
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feeding Schedules</h1>
        <CreateFeedingScheduleModal
          ponds={ponds.map((p) => ({ id: p.id, name: p.name }))}
          feeds={feeds.map((f) => ({ id: f.id, name: f.name }))}
          farmers={farmers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
          shrimpTypes={shrimpTypes}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Feeding Ponds Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type(s)</th>
                  <th className="pb-2 font-medium">Active / pending schedules</th>
                  <th className="pb-2 font-medium">Today&apos;s feeding progress</th>
                  <th className="pb-2 font-medium">Total feed consumed</th>
                  <th className="pb-2 font-medium">Last fed</th>
                </tr>
              </thead>
              <tbody>
                {feedingPondSummary.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No feeding ponds with schedules yet." />
                    </td>
                  </tr>
                ) : (
                  feedingPondSummary.map((summary) => (
                    <tr key={summary.pondId} className="border-b">
                      <td className="py-2 font-medium">{summary.pondName}</td>
                      <td className="py-2">
                        {summary.shrimpTypes.length > 0 ? summary.shrimpTypes.join(", ") : "—"}
                      </td>
                      <td className="py-2">{summary.pendingCount}</td>
                      <td className="py-2">
                        {summary.todayTotal === 0
                          ? "—"
                          : `${summary.todayCompleted} / ${summary.todayTotal}`}
                      </td>
                      <td className="py-2">{formatFeedTotal(summary.totalFeedConsumed)}</td>
                      <td className="py-2 text-muted-foreground">
                        {summary.lastFed ? new Date(summary.lastFed).toLocaleString() : "—"}
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
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Feed</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Assigned to</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <DataTableEmpty message="No feeding schedules yet." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => {
                    const latestConfirmation = s.confirmations[0];
                    const lateConfirmation = s.confirmations.find((c) => c.isLate);
                    const isCompletedLate = s.status === "COMPLETED" && Boolean(lateConfirmation);
                    return (
                    <tr key={s.id} className="border-b">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{s.feed.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.quantity.toString()}</td>
                      <td className="py-2">
                        {isCompletedLate ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">Completed Late</Badge>
                            {lateConfirmation?.farmer ? (
                              <span className="text-muted-foreground text-xs">
                                by {lateConfirmation.farmer.name || lateConfirmation.farmer.email}
                              </span>
                            ) : null}
                            {lateConfirmation?.lateReason ? (
                              <span className="text-muted-foreground text-xs italic">
                                Reason: {lateConfirmation.lateReason}
                              </span>
                            ) : null}
                            {latestConfirmation?.notes ? (
                              <span className="text-muted-foreground text-xs italic">
                                Notes: {latestConfirmation.notes}
                              </span>
                            ) : null}
                          </div>
                        ) : s.status === "DELAYED" ? (
                          <Badge variant="secondary">DELAYED</Badge>
                        ) : s.status === "MISSED" ? (
                          <Badge variant="destructive">MISSED</Badge>
                        ) : s.status === "COMPLETED" ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="default">COMPLETED</Badge>
                            {latestConfirmation?.farmer ? (
                              <span className="text-muted-foreground text-xs">
                                by {latestConfirmation.farmer.name || latestConfirmation.farmer.email}
                              </span>
                            ) : null}
                            {latestConfirmation?.notes ? (
                              <span className="text-muted-foreground text-xs italic">
                                Notes: {latestConfirmation.notes}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="outline">{s.status}</Badge>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {s.assignedFarmer ? s.assignedFarmer.name || s.assignedFarmer.email : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <EditFeedingScheduleModal
                            schedule={{
                              id: s.id,
                              scheduledAt: new Date(s.scheduledAt).toISOString(),
                              quantity: s.quantity.toString(),
                              assignedFarmerId: s.assignedFarmerId,
                              shrimpTypeId: s.shrimpTypeId,
                              shrimpTypeDefaultUnitLabel:
                                s.shrimpType?.defaultFeedingUnit?.abbreviation ||
                                s.shrimpType?.defaultFeedingUnit?.name ||
                                null,
                            }}
                            farmers={farmers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
                            shrimpTypes={shrimpTypes}
                          />
                          <ToastActionButton
                            action={deleteFeedingSchedule}
                            actionArg={s.id}
                            successMessage="Schedule deleted"
                            errorMessage="Failed to delete schedule"
                            variant="destructive"
                            size="sm"
                            confirmTitle="Delete feeding schedule?"
                            confirmDescription="This action cannot be undone."
                          >
                            Delete
                          </ToastActionButton>
                        </div>
                      </td>
                    </tr>
                    );
                  })
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
