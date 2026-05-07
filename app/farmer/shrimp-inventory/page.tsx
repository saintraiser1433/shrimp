import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreateShrimpInventoryModal } from "@/components/modals/create-shrimp-inventory-modal";
import { FarmerFeedingCalendarModal } from "@/components/modals/farmer-feeding-calendar-modal";
import { deleteShrimpInventory } from "@/lib/actions/shrimp-inventory";

const DEFAULT_PAGE_SIZE = 10;

function getStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "HARVESTED":
      return "secondary";
    case "IN_POND":
      return "default";
    default:
      return "outline";
  }
}

export default async function FarmerShrimpInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }> | { page?: string; pageSize?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

  const where = { userId: session.user.id };
  const [inventories, totalCount, types, units] = await Promise.all([
    prisma.shrimpInventory.findMany({
      where,
      include: {
        shrimpType: true,
        unit: true,
        pondAssignments: {
          include: {
            pond: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shrimpInventory.count({ where }),
    prisma.shrimpType.findMany({
      orderBy: { name: "asc" },
      include: {
        defaultFeedingUnit: true,
        expectedHarvestUnit: true,
        growthStages: {
          include: {
            feed: { select: { id: true, name: true } },
            feedUnit: { select: { id: true, name: true, abbreviation: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { startDayFromStocking: "asc" }],
        },
      },
    }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
  ]);

  const relevantPondIds = Array.from(
    new Set(
      inventories.flatMap((inventory) =>
        inventory.pondAssignments.map((assignment) => assignment.pondId),
      ),
    ),
  );
  const relevantShrimpTypeIds = Array.from(
    new Set(inventories.map((inventory) => inventory.shrimpTypeId)),
  );

  const feedingCalendarSchedules =
    relevantPondIds.length === 0 || relevantShrimpTypeIds.length === 0
      ? []
      : await prisma.feedingSchedule.findMany({
          where: {
            assignedFarmerId: session.user.id,
            pondId: { in: relevantPondIds },
            shrimpTypeId: { in: relevantShrimpTypeIds },
          },
          include: {
            pond: { select: { id: true, name: true } },
            feed: { select: { id: true, name: true } },
            pondStocking: { select: { stockedAt: true } },
          },
          orderBy: { scheduledAt: "asc" },
        });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Shrimp Inventory</h1>
        <CreateShrimpInventoryModal
          types={types.map((t) => ({
            id: t.id,
            name: t.name,
            defaultFeedingIntervalDays: t.defaultFeedingIntervalDays,
            defaultFeedingQty: t.defaultFeedingQty?.toString() ?? null,
            defaultFeedingUnitLabel: t.defaultFeedingUnit
              ? t.defaultFeedingUnit.abbreviation || t.defaultFeedingUnit.name
              : null,
            expectedHarvestDays: t.expectedHarvestDays,
            expectedHarvestQty: t.expectedHarvestQty?.toString() ?? null,
            expectedHarvestUnitLabel: t.expectedHarvestUnit
              ? t.expectedHarvestUnit.abbreviation || t.expectedHarvestUnit.name
              : null,
            growthStages: t.growthStages.map((stage) => ({
              id: stage.id,
              stageName: stage.stageName,
              startDayFromStocking: stage.startDayFromStocking,
              endDayFromStocking: stage.endDayFromStocking,
              feedName: stage.feed?.name ?? null,
              feedQtyPerSession: stage.feedQtyPerSession.toString(),
              feedingSessionsPerDay: stage.feedingSessionsPerDay,
              feedUnitLabel: stage.feedUnit
                ? stage.feedUnit.abbreviation || stage.feedUnit.name
                : null,
            })),
          }))}
          units={units.map((u) => ({ id: u.id, name: u.name }))}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Assigned pond(s)</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventories.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No inventory entries yet." />
                    </td>
                  </tr>
                ) : (
                  inventories.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="py-2">{i.shrimpType.name}</td>
                      <td className="py-2">{i.quantity.toString()}</td>
                      <td className="py-2">{i.unit.abbreviation || i.unit.name}</td>
                      <td className="py-2">
                        <Badge variant={getStatusVariant(i.status)}>
                          {i.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {i.pondAssignments.length > 0
                          ? i.pondAssignments.map((assignment) => assignment.pond.name).join(", ")
                          : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <FarmerFeedingCalendarModal
                            shrimpTypeName={i.shrimpType.name}
                            stageDefinitions={
                              types
                                .find((type) => type.id === i.shrimpTypeId)
                                ?.growthStages.map((stage) => ({
                                  stageName: stage.stageName,
                                  startDayFromStocking: stage.startDayFromStocking,
                                  endDayFromStocking: stage.endDayFromStocking,
                                })) ?? []
                            }
                            items={feedingCalendarSchedules
                              .filter(
                                (schedule) =>
                                  schedule.shrimpTypeId === i.shrimpTypeId &&
                                  i.pondAssignments.some(
                                    (assignment) => assignment.pondId === schedule.pondId,
                                  ),
                              )
                              .map((schedule) => ({
                                id: schedule.id,
                                pondName: schedule.pond.name,
                                feedName: schedule.feed.name,
                                growthStageName: schedule.growthStageName,
                                scheduledAtIso: schedule.scheduledAt.toISOString(),
                                quantity: schedule.quantity.toString(),
                                status: schedule.status,
                                dayFromStocking: schedule.pondStocking
                                  ? Math.floor(
                                      (new Date(schedule.scheduledAt).setHours(0, 0, 0, 0) -
                                        new Date(schedule.pondStocking.stockedAt).setHours(
                                          0,
                                          0,
                                          0,
                                          0,
                                        )) /
                                        (24 * 60 * 60 * 1000),
                                    ) + 1
                                  : null,
                              }))}
                          />
                        <ToastActionButton
                          action={deleteShrimpInventory}
                          actionArg={i.id}
                          successMessage="Inventory entry deleted"
                          errorMessage="Failed to delete"
                          variant="destructive"
                          size="sm"
                          confirmTitle="Delete inventory entry?"
                          confirmDescription="This action cannot be undone."
                        >
                          Delete
                        </ToastActionButton>
                        </div>
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
