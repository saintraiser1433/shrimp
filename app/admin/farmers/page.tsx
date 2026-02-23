import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { AddFarmerModal } from "@/components/modals/add-farmer-modal";
import { EditFarmerModal } from "@/components/modals/edit-farmer-modal";
import { deleteFarmer } from "@/lib/actions/farmers";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminFarmersPage({
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

  const [farmers, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FARMER" },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            shrimpInventories: true,
            harvests: true,
            feedingConfirmations: true,
          },
        },
      },
    }),
    prisma.user.count({ where: { role: "FARMER" } }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Farmers</h1>
        <AddFarmerModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Farmer accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Inventory entries</th>
                  <th className="pb-2 font-medium">Harvests</th>
                  <th className="pb-2 font-medium">Feedings confirmed</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <DataTableEmpty message="No farmer accounts yet." />
                    </td>
                  </tr>
                ) : (
                  farmers.map((f) => (
                    <tr key={f.id} className="border-b">
                      <td className="py-2 font-medium">{f.name || "—"}</td>
                      <td className="py-2 text-muted-foreground">{f.email}</td>
                      <td className="py-2">{f._count.shrimpInventories}</td>
                      <td className="py-2">{f._count.harvests}</td>
                      <td className="py-2">{f._count.feedingConfirmations}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <EditFarmerModal
                            farmer={{
                              id: f.id,
                              name: f.name,
                              email: f.email,
                            }}
                          />
                          <ToastActionButton
                            action={deleteFarmer}
                            actionArg={f.id}
                            successMessage="Farmer account removed"
                            errorMessage="Failed to remove farmer"
                            variant="destructive"
                            size="sm"
                            confirmTitle="Remove farmer account?"
                            confirmDescription="This will permanently delete the account and all related data (inventory, harvests, etc.)."
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
