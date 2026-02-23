import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { RequestWaterMaintenanceCompletionButton } from "@/components/request-water-maintenance-completion-button";

export default async function FarmerWaterMaintenancePage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const schedules = await prisma.waterMaintenanceSchedule.findMany({
    where: { assignedFarmerId: session.user.id },
    include: { pond: { select: { name: true } } },
    orderBy: { scheduledAt: "desc" },
  });

  return (
    <>
      <h1 className="text-2xl font-bold">Water maintenance</h1>
      <Card>
        <CardHeader>
          <CardTitle>My assigned water maintenance</CardTitle>
          <p className="text-muted-foreground text-sm">
            Schedules assigned to you by the admin. Complete them at the pond and inform the admin when done.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Notes</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No water maintenance assigned to you yet." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b align-top">
                      <td className="py-2">{s.pond.name}</td>
                      <td className="py-2">{s.type}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2 text-muted-foreground">{s.notes || "—"}</td>
                      <td className="py-2">
                        {s.completedAt ? (
                          <span className="text-muted-foreground">Completed</span>
                        ) : s.completionRequestedBy ? (
                          <span>Pending approval</span>
                        ) : (
                          <span>Pending</span>
                        )}
                      </td>
                      <td className="py-2">
                        {!s.completedAt && !s.completionRequestedBy && (
                          <RequestWaterMaintenanceCompletionButton scheduleId={s.id} />
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
