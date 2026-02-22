import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DeclareHarvestModal } from "@/components/modals/declare-harvest-modal";

export default async function FarmerHarvestPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const [schedules, ponds, units, recentHarvests] = await Promise.all([
    prisma.harvestSchedule.findMany({
      where: { status: "SCHEDULED" },
      include: { pond: true, unit: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.pond.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
    prisma.harvest.findMany({
      where: { farmerId: session.user.id },
      include: { pond: true, unit: true },
      orderBy: { harvestedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Harvest</h1>
        <DeclareHarvestModal
          ponds={ponds.map((p) => ({ id: p.id, name: p.name }))}
          units={units.map((u) => ({ id: u.id, name: u.name, abbreviation: u.abbreviation }))}
          schedules={schedules.map((s) => ({
            id: s.id,
            pond: { name: s.pond.name },
            scheduledAt: s.scheduledAt,
          }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harvest schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Scheduled at</th>
                  <th className="pb-2 font-medium">Est. quantity</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <DataTableEmpty message="No harvest schedules." />
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 font-medium">{s.pond.name}</td>
                      <td className="py-2">{new Date(s.scheduledAt).toLocaleString()}</td>
                      <td className="py-2">
                        {s.estimatedQty.toString()} {s.unit.abbreviation || s.unit.name}
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
          <CardTitle>My recent harvests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentHarvests.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <DataTableEmpty message="No harvests declared yet." />
                    </td>
                  </tr>
                ) : (
                  recentHarvests.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-2">{h.pond.name}</td>
                      <td className="py-2">
                        {h.actualQty.toString()} {h.unit.abbreviation || h.unit.name}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(h.harvestedAt).toLocaleString()}
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
