import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { AddPondModal } from "@/components/modals/add-pond-modal";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminPondsPage({
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

  const [ponds, totalCount] = await Promise.all([
    prisma.pond.findMany({
      include: {
        _count: { select: { waterMaintenanceSchedules: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pond.count(),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ponds & Water Maintenance</h1>
        <AddPondModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ponds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Maintenance</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ponds.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No ponds yet. Add a pond to get started." />
                    </td>
                  </tr>
                ) : (
                  ponds.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2">{p.location || "—"}</td>
                      <td className="py-2">{p.size || "—"}</td>
                      <td className="py-2">{p.status}</td>
                      <td className="py-2">{p._count.waterMaintenanceSchedules}</td>
                      <td className="py-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/ponds/${p.id}`}>View</Link>
                        </Button>
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
