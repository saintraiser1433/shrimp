import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";

const DEFAULT_PAGE_SIZE = 10;

function variancePercent(actual: number, expected: number | null): string {
  if (!expected || expected <= 0) return "—";
  const pct = ((actual - expected) / expected) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function getStockingStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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

export default async function AdminHarvestPerformancePage({
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

  const [harvestsForTable, totalCount, harvestsForAgg, stockings] = await Promise.all([
    prisma.harvest.findMany({
      include: { pond: true, farmer: true, unit: true, schedule: true },
      orderBy: { harvestedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.harvest.count(),
    prisma.harvest.findMany({
      include: { pond: true },
      orderBy: { harvestedAt: "desc" },
      take: 500,
    }),
    prisma.pondStocking.findMany({
      include: {
        pond: true,
        shrimpType: { include: { expectedHarvestUnit: true } },
        initialUnit: true,
        harvestSchedules: {
          include: {
            unit: true,
            harvests: { include: { unit: true } },
          },
        },
      },
      orderBy: { stockedAt: "desc" },
      take: 100,
    }),
  ]);

  const batchPerformance = stockings.map((s) => {
    let actualTotal = 0;
    let actualUnitLabel: string | null = null;
    for (const sched of s.harvestSchedules) {
      for (const h of sched.harvests) {
        actualTotal += Number(h.actualQty);
        if (!actualUnitLabel) {
          actualUnitLabel = h.unit.abbreviation || h.unit.name;
        }
      }
    }
    const expectedQty = s.expectedHarvestQty ? Number(s.expectedHarvestQty) : null;
    const expectedUnitLabel = s.shrimpType.expectedHarvestUnit
      ? s.shrimpType.expectedHarvestUnit.abbreviation || s.shrimpType.expectedHarvestUnit.name
      : null;
    return {
      id: s.id,
      pondName: s.pond.name,
      shrimpTypeName: s.shrimpType.name,
      stockedAt: s.stockedAt,
      initialQuantity: s.initialQuantity.toString(),
      initialUnitLabel: s.initialUnit ? s.initialUnit.abbreviation || s.initialUnit.name : null,
      expectedHarvestDate: s.expectedHarvestDate,
      expectedQty,
      expectedUnitLabel,
      actualTotal,
      actualUnitLabel: actualUnitLabel || expectedUnitLabel,
      status: s.status,
      hasHarvests: actualTotal > 0,
    };
  });

  const byPond = harvestsForAgg.reduce<Record<string, { total: number; count: number }>>(
    (acc, h) => {
      const key = h.pond.name;
      if (!acc[key]) acc[key] = { total: 0, count: 0 };
      acc[key].total += Number(h.actualQty);
      acc[key].count += 1;
      return acc;
    },
    {}
  );

  return (
    <>
      <h1 className="text-2xl font-bold">Harvest Performance</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byPond).map(([pondName, data]) => (
          <Card key={pondName}>
            <CardHeader>
              <CardTitle className="text-base">{pondName}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.total}</p>
              <p className="text-muted-foreground text-sm">
                Total from {data.count} harvest(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Batch performance (expected vs actual)</CardTitle>
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
                  <th className="pb-2 font-medium">Expected</th>
                  <th className="pb-2 font-medium">Actual</th>
                  <th className="pb-2 font-medium">Variance</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <DataTableEmpty message="No pond stockings yet." />
                    </td>
                  </tr>
                ) : (
                  batchPerformance.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2 font-medium">{b.pondName}</td>
                      <td className="py-2">{b.shrimpTypeName}</td>
                      <td className="py-2">
                        {new Date(b.stockedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {b.initialQuantity}
                        {b.initialUnitLabel ? ` ${b.initialUnitLabel}` : ""}
                      </td>
                      <td className="py-2">
                        {b.expectedQty !== null
                          ? `${b.expectedQty}${b.expectedUnitLabel ? ` ${b.expectedUnitLabel}` : ""}`
                          : "—"}
                        {b.expectedHarvestDate ? (
                          <div className="text-muted-foreground text-xs">
                            by {new Date(b.expectedHarvestDate).toLocaleDateString()}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2">
                        {b.hasHarvests
                          ? `${b.actualTotal}${b.actualUnitLabel ? ` ${b.actualUnitLabel}` : ""}`
                          : "—"}
                      </td>
                      <td className="py-2">
                        {b.hasHarvests && b.expectedQty
                          ? variancePercent(b.actualTotal, b.expectedQty)
                          : "—"}
                      </td>
                      <td className="py-2">
                        <Badge variant={getStockingStatusVariant(b.status)}>
                          {b.status.replaceAll("_", " ")}
                        </Badge>
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
          <CardTitle>Recent harvests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Farmer</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {harvestsForTable.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <DataTableEmpty message="No harvests recorded yet." />
                    </td>
                  </tr>
                ) : (
                  harvestsForTable.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-2">{h.pond.name}</td>
                      <td className="py-2">{h.actualQty.toString()}</td>
                      <td className="py-2">{h.unit.abbreviation || h.unit.name}</td>
                      <td className="py-2">{h.farmer.name || h.farmer.email}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(h.harvestedAt).toLocaleString()}
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
