import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreateHarvestScheduleModal } from "@/components/modals/create-harvest-schedule-modal";
import { EditHarvestScheduleModal } from "@/components/modals/edit-harvest-schedule-modal";
import { deleteHarvestSchedule } from "@/lib/actions/harvest";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminHarvestSchedulesPage({
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

  const [schedules, totalCount, ponds, units, farmers, shrimpTypes, scheduledHarvestPondRows] =
    await Promise.all([
    prisma.harvestSchedule.findMany({
      include: { pond: true, shrimpType: true, unit: true, farmer: true },
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.harvestSchedule.count(),
    prisma.pond.findMany({ orderBy: { name: "asc" } }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "FARMER" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.shrimpType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.harvestSchedule.findMany({
      where: { status: "SCHEDULED" },
      select: { pondId: true },
    }),
  ]);

  const pondsWithScheduledHarvest = new Set(scheduledHarvestPondRows.map((r) => r.pondId));
  const pondsEligibleForNewSchedule = ponds.filter((p) => !pondsWithScheduledHarvest.has(p.id));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Harvest Schedules</h1>
        <CreateHarvestScheduleModal
          ponds={pondsEligibleForNewSchedule.map((p) => ({ id: p.id, name: p.name }))}
          units={units.map((u) => ({ id: u.id, name: u.name, abbreviation: u.abbreviation }))}
          farmers={farmers.map((f) => ({ id: f.id, name: f.name, email: f.email }))}
          shrimpTypes={shrimpTypes}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedules by pond</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Est. quantity</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Assigned farmer</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <DataTableEmpty message="No harvest schedules yet. Create one to allow farmers to declare harvests for that pond." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 font-medium">{s.pond.name}</td>
                      <td className="py-2">{s.shrimpType?.name || "—"}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">{s.estimatedQty.toString()}</td>
                      <td className="py-2">{s.unit.abbreviation || s.unit.name}</td>
                      <td className="py-2 text-muted-foreground">
                        {s.farmer ? s.farmer.name || s.farmer.email : "—"}
                      </td>
                      <td className="py-2">{s.status}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <EditHarvestScheduleModal
                            schedule={{
                              id: s.id,
                              shrimpTypeId: s.shrimpTypeId,
                              scheduledAt: new Date(s.scheduledAt).toISOString(),
                              estimatedQty: s.estimatedQty.toString(),
                              unitId: s.unitId,
                              farmerId: s.farmerId,
                            }}
                            units={units.map((u) => ({
                              id: u.id,
                              name: u.name,
                              abbreviation: u.abbreviation,
                            }))}
                            farmers={farmers.map((f) => ({
                              id: f.id,
                              name: f.name,
                              email: f.email,
                            }))}
                            shrimpTypes={shrimpTypes}
                          />
                          <ToastActionButton
                            action={deleteHarvestSchedule}
                            actionArg={s.id}
                            successMessage="Harvest schedule deleted"
                            errorMessage="Failed to delete harvest schedule"
                            variant="destructive"
                            size="sm"
                            confirmTitle="Delete harvest schedule?"
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
