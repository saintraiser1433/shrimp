import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { AddShrimpTypeModal } from "@/components/modals/add-shrimp-type-modal";
import { EditShrimpTypeModal } from "@/components/modals/edit-shrimp-type-modal";
import { ManageGrowthStagesModal } from "@/components/modals/manage-growth-stages-modal";
import { deleteShrimpType } from "@/lib/actions/shrimp-types";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminShrimpTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }> | { page?: string; pageSize?: string };
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const params = await Promise.resolve(searchParams);
  const page = Math.max(1, parseInt(params?.page ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(10, parseInt(params?.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));

  const [types, totalCount, units, feeds] = await Promise.all([
    prisma.shrimpType.findMany({
      include: {
        defaultFeedingUnit: true,
        expectedHarvestUnit: true,
        growthStages: {
          orderBy: [{ sortOrder: "asc" }, { startDayFromStocking: "asc" }],
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shrimpType.count(),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
    prisma.feedsInventory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const unitOptions = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    abbreviation: unit.abbreviation,
  }));
  const feedOptions = feeds.map((feed) => ({ id: feed.id, name: feed.name }));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shrimp Types</h1>
        <AddShrimpTypeModal units={unitOptions} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shrimp types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Default feeding</th>
                  <th className="pb-2 font-medium">Expected harvest</th>
                  <th className="pb-2 font-medium">Stages</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No shrimp types yet." />
                    </td>
                  </tr>
                ) : (
                  types.map((t) => {
                    const defaultUnitLabel = t.defaultFeedingUnit
                      ? t.defaultFeedingUnit.abbreviation || t.defaultFeedingUnit.name
                      : null;
                    const expectedUnitLabel = t.expectedHarvestUnit
                      ? t.expectedHarvestUnit.abbreviation || t.expectedHarvestUnit.name
                      : null;
                    const feedingSummary = t.defaultFeedingQty
                      ? `${t.defaultFeedingQty.toString()}${defaultUnitLabel ? ` ${defaultUnitLabel}` : ""}${
                          t.defaultFeedingIntervalDays
                            ? `; feed days spaced ${t.defaultFeedingIntervalDays} day${t.defaultFeedingIntervalDays === 1 ? "" : "s"} apart`
                            : ""
                        }`
                      : t.defaultFeedingIntervalDays
                        ? `Feed days spaced ${t.defaultFeedingIntervalDays} day${t.defaultFeedingIntervalDays === 1 ? "" : "s"} apart`
                        : "—";
                    const harvestSummary =
                      t.expectedHarvestQty || t.expectedHarvestDays
                        ? `${t.expectedHarvestQty ? t.expectedHarvestQty.toString() : "?"}${
                            expectedUnitLabel ? ` ${expectedUnitLabel}` : ""
                          }${t.expectedHarvestDays ? ` after ${t.expectedHarvestDays} days` : ""}`
                        : "—";
                    return (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 font-medium">{t.name}</td>
                        <td className="py-2 text-muted-foreground">{t.description || "—"}</td>
                        <td className="py-2">{feedingSummary}</td>
                        <td className="py-2">{harvestSummary}</td>
                        <td className="py-2">{t.growthStages.length}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <EditShrimpTypeModal
                              type={{
                                id: t.id,
                                name: t.name,
                                description: t.description,
                                defaultFeedingIntervalDays: t.defaultFeedingIntervalDays,
                                defaultFeedingQty:
                                  t.defaultFeedingQty === null
                                    ? null
                                    : t.defaultFeedingQty.toString(),
                                defaultFeedingUnitId: t.defaultFeedingUnitId,
                                expectedHarvestDays: t.expectedHarvestDays,
                                expectedHarvestQty:
                                  t.expectedHarvestQty === null
                                    ? null
                                    : t.expectedHarvestQty.toString(),
                                expectedHarvestUnitId: t.expectedHarvestUnitId,
                              }}
                              units={unitOptions}
                            />
                            <ManageGrowthStagesModal
                              shrimpTypeId={t.id}
                              shrimpTypeName={t.name}
                              stages={t.growthStages.map((stage) => ({
                                id: stage.id,
                                stageName: stage.stageName,
                                startDayFromStocking: stage.startDayFromStocking,
                                endDayFromStocking: stage.endDayFromStocking,
                                feedId: stage.feedId,
                                feedQtyPerSession: stage.feedQtyPerSession.toString(),
                                feedingSessionsPerDay: stage.feedingSessionsPerDay,
                                feedUnitId: stage.feedUnitId,
                                sortOrder: stage.sortOrder,
                              }))}
                              feeds={feedOptions}
                              units={unitOptions}
                            />
                            <ToastActionButton
                              action={deleteShrimpType}
                              actionArg={t.id}
                              successMessage="Shrimp type deleted"
                              errorMessage="Failed to delete shrimp type"
                              variant="destructive"
                              size="sm"
                              confirmTitle="Delete shrimp type?"
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
