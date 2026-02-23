import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreateShrimpInventoryModal } from "@/components/modals/create-shrimp-inventory-modal";
import { deleteShrimpInventory } from "@/lib/actions/shrimp-inventory";

const DEFAULT_PAGE_SIZE = 10;

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
      include: { shrimpType: true, unit: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shrimpInventory.count({ where }),
    prisma.shrimpType.findMany({ orderBy: { name: "asc" } }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Shrimp Inventory</h1>
        <CreateShrimpInventoryModal
          types={types.map((t) => ({ id: t.id, name: t.name }))}
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
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventories.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
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
