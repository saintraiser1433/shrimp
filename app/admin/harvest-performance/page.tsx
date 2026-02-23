import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";

const DEFAULT_PAGE_SIZE = 10;

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

  const [harvestsForTable, totalCount, harvestsForAgg] = await Promise.all([
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
  ]);

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
