import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { InventoryStatusSelect } from "@/components/inventory-status-select";
import { Badge } from "@/components/ui/badge";

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

export default async function AdminShrimpInventoryPage({
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

  const [inventories, totalCount] = await Promise.all([
    prisma.shrimpInventory.findMany({
      include: {
        shrimpType: true,
        unit: true,
        user: true,
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
    prisma.shrimpInventory.count(),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold">Shrimp Inventory</h1>
      <Card>
        <CardHeader>
          <CardTitle>All shrimp inventory (by farmers)</CardTitle>
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
                  <th className="pb-2 font-medium">Farmer</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {inventories.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <DataTableEmpty message="No shrimp inventory entries yet." />
                    </td>
                  </tr>
                ) : (
                  inventories.map((i) => (
                    <tr key={i.id} className="border-b">
                      <td className="py-2">{i.shrimpType.name}</td>
                      <td className="py-2">{i.quantity.toString()}</td>
                      <td className="py-2">{i.unit.abbreviation || i.unit.name}</td>
                      <td className="py-2">
                        <div className="flex flex-col gap-2">
                          <Badge variant={getStatusVariant(i.status)}>
                            {i.status.replaceAll("_", " ")}
                          </Badge>
                          <InventoryStatusSelect inventoryId={i.id} currentStatus={i.status} />
                        </div>
                      </td>
                      <td className="py-2">
                        {i.pondAssignments.length > 0
                          ? i.pondAssignments.map((assignment) => assignment.pond.name).join(", ")
                          : "—"}
                      </td>
                      <td className="py-2">{i.user.name || i.user.email}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(i.createdAt).toLocaleDateString()}
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
