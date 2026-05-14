import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreatePondStockingModal } from "@/components/modals/create-pond-stocking-modal";
import {
  deletePondStocking,
  regenerateStockingSchedules,
  terminatePondStocking,
} from "@/lib/actions/pond-stockings";

const DEFAULT_PAGE_SIZE = 10;

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "HARVESTED":
      return "secondary";
    case "TERMINATED":
      return "destructive";
    default:
      return "outline";
  }
}

function daysBetween(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

type GrowthStageRow = {
  stageName: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
};

function findCurrentStage(stages: GrowthStageRow[], dayFromStocking: number): GrowthStageRow | null {
  for (const stage of stages) {
    if (
      dayFromStocking >= stage.startDayFromStocking &&
      dayFromStocking <= stage.endDayFromStocking
    ) {
      return stage;
    }
  }
  return null;
}

export default async function AdminPondStockingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }> | { page?: string; pageSize?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const [stockings, totalCount, ponds, shrimpTypes, units, farmers] = await Promise.all([
    prisma.pondStocking.findMany({
      include: {
        pond: true,
        shrimpType: {
          include: {
            growthStages: {
              orderBy: [{ sortOrder: "asc" }, { startDayFromStocking: "asc" }],
            },
            expectedHarvestUnit: true,
          },
        },
        initialUnit: true,
        assignedFarmer: true,
      },
      orderBy: { stockedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pondStocking.count(),
    prisma.pond.findMany({ orderBy: { name: "asc" } }),
    prisma.shrimpType.findMany({
      orderBy: { name: "asc" },
      include: { expectedHarvestUnit: true },
    }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: "FARMER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const today = new Date();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pond Stockings</h1>
        <CreatePondStockingModal
          ponds={ponds.map((p) => ({ id: p.id, name: p.name }))}
          shrimpTypes={shrimpTypes.map((s) => ({
            id: s.id,
            name: s.name,
            expectedHarvestDays: s.expectedHarvestDays,
            expectedHarvestQty:
              s.expectedHarvestQty === null ? null : s.expectedHarvestQty.toString(),
            expectedHarvestUnitLabel: s.expectedHarvestUnit
              ? s.expectedHarvestUnit.abbreviation || s.expectedHarvestUnit.name
              : null,
          }))}
          units={units.map((u) => ({
            id: u.id,
            name: u.name,
            abbreviation: u.abbreviation,
          }))}
          farmers={farmers}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active and historical stockings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Stocked</th>
                  <th className="pb-2 font-medium">Initial qty</th>
                  <th className="pb-2 font-medium">Current stage</th>
                  <th className="pb-2 font-medium">Expected harvest</th>
                  <th className="pb-2 font-medium">Farmer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockings.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <DataTableEmpty message="No pond stockings yet." />
                    </td>
                  </tr>
                ) : (
                  stockings.map((s) => {
                    const day = daysBetween(today, s.stockedAt) + 1;
                    const currentStage =
                      s.status === "ACTIVE"
                        ? findCurrentStage(s.shrimpType.growthStages, day)
                        : null;
                    const initialUnitLabel = s.initialUnit
                      ? s.initialUnit.abbreviation || s.initialUnit.name
                      : "";
                    const expectedUnit = s.shrimpType.expectedHarvestUnit
                      ? s.shrimpType.expectedHarvestUnit.abbreviation ||
                        s.shrimpType.expectedHarvestUnit.name
                      : null;
                    const lastStageEndDay = s.shrimpType.growthStages.reduce(
                      (max, st) => Math.max(max, st.endDayFromStocking),
                      0,
                    );
                    const readyByStageTimeline =
                      s.status === "ACTIVE" && lastStageEndDay > 0 && day >= lastStageEndDay;
                    const readyByExpectedDate =
                      s.status === "ACTIVE" &&
                      Boolean(s.expectedHarvestDate) &&
                      startOfCalendarDay(new Date(s.expectedHarvestDate!)).getTime() <=
                        startOfCalendarDay(today).getTime();
                    const readyForHarvest = readyByStageTimeline || readyByExpectedDate;
                    return (
                      <tr key={s.id} className="border-b">
                        <td className="py-2 font-medium">{s.pond.name}</td>
                        <td className="py-2">{s.shrimpType.name}</td>
                        <td className="py-2">
                          {new Date(s.stockedAt).toLocaleDateString()}
                          <span className="text-muted-foreground"> · day {day}</span>
                        </td>
                        <td className="py-2">
                          {s.initialQuantity.toString()}
                          {initialUnitLabel ? ` ${initialUnitLabel}` : ""}
                        </td>
                        <td className="py-2">
                          {currentStage
                            ? `${currentStage.stageName} (day ${currentStage.startDayFromStocking}–${currentStage.endDayFromStocking})`
                            : s.status === "ACTIVE"
                            ? "—"
                            : "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-col gap-1 items-start">
                            <span>
                              {s.expectedHarvestDate
                                ? new Date(s.expectedHarvestDate).toLocaleDateString()
                                : "—"}
                              {s.expectedHarvestQty
                                ? ` · est. harvest ${s.expectedHarvestQty.toString()}${
                                    expectedUnit ? ` ${expectedUnit}` : ""
                                  }`
                                : ""}
                            </span>
                            {s.shrimpType.expectedHarvestDays != null &&
                            s.shrimpType.expectedHarvestDays > 0 ? (
                              <span className="text-muted-foreground text-xs">
                                From shrimp type: stocking date + {s.shrimpType.expectedHarvestDays}{" "}
                                harvest day(s); quantity from type default when recorded.
                              </span>
                            ) : s.shrimpType.expectedHarvestQty != null ? (
                              <span className="text-muted-foreground text-xs">
                                Expected harvest quantity from shrimp type default.
                              </span>
                            ) : null}
                            {readyForHarvest ? (
                              <Badge variant="secondary">Ready for harvest</Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {s.assignedFarmer
                            ? s.assignedFarmer.name || s.assignedFarmer.email
                            : "—"}
                        </td>
                        <td className="py-2">
                          <Badge variant={getStatusVariant(s.status)}>
                            {s.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.status === "ACTIVE" ? (
                              <>
                                <ToastActionButton
                                  action={regenerateStockingSchedules}
                                  actionArg={s.id}
                                  successMessage="Schedules generated"
                                  errorMessage="Failed to generate schedules"
                                  variant="outline"
                                  size="sm"
                                >
                                  Generate schedules
                                </ToastActionButton>
                                <ToastActionButton
                                  action={terminatePondStocking}
                                  actionArg={s.id}
                                  successMessage="Stocking terminated"
                                  errorMessage="Failed to terminate"
                                  variant="outline"
                                  size="sm"
                                  confirmTitle="Terminate this stocking?"
                                  confirmDescription="This marks the stocking as ended without harvest."
                                >
                                  Terminate
                                </ToastActionButton>
                              </>
                            ) : null}
                            <ToastActionButton
                              action={deletePondStocking}
                              actionArg={s.id}
                              successMessage="Stocking deleted"
                              errorMessage="Failed to delete"
                              variant="destructive"
                              size="sm"
                              confirmTitle="Delete this stocking?"
                              confirmDescription="This will detach all linked feeding and harvest schedules."
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
