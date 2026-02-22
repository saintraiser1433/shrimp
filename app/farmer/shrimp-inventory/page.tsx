import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { ToastActionButton } from "@/components/toast-action-button";
import { CreateShrimpInventoryModal } from "@/components/modals/create-shrimp-inventory-modal";
import { deleteShrimpInventory } from "@/lib/actions/shrimp-inventory";

export default async function FarmerShrimpInventoryPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const [inventories, types, units] = await Promise.all([
    prisma.shrimpInventory.findMany({
      where: { userId: session.user.id },
      include: { shrimpType: true, unit: true },
      orderBy: { createdAt: "desc" },
    }),
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
        </CardContent>
      </Card>
    </>
  );
}
