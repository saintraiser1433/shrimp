import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { DataTablePagination } from "@/components/data-table-pagination";
import { ToastActionButton } from "@/components/toast-action-button";
import { AssignShrimpModal } from "@/components/modals/assign-shrimp-modal";
import { unassignShrimpFromPond } from "@/lib/actions/pond-assignments";

const DEFAULT_PAGE_SIZE = 10;

export default async function AdminPondAssignmentsPage({
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

  const [assignments, totalCount, ponds, inventories] = await Promise.all([
    prisma.pondShrimpAssignment.findMany({
      include: {
        pond: true,
        shrimpInventory: {
          include: { shrimpType: true, unit: true, user: true },
        },
      },
      orderBy: { assignedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pondShrimpAssignment.count(),
    prisma.pond.findMany({ orderBy: { name: "asc" } }),
    prisma.shrimpInventory.findMany({
      include: { shrimpType: true, unit: true, user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serializedInventories = inventories.map((i) => ({
    id: i.id,
    shrimpType: { name: i.shrimpType.name },
    quantity: i.quantity.toString(),
    unit: { abbreviation: i.unit.abbreviation, name: i.unit.name },
    user: { name: i.user.name, email: i.user.email },
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pond Assignments</h1>
        <AssignShrimpModal
          ponds={ponds.map((p) => ({ id: p.id, name: p.name }))}
          inventories={serializedInventories}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Shrimp type</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Farmer</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <DataTableEmpty message="No assignments yet." />
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-2 font-medium">{a.pond.name}</td>
                      <td className="py-2">{a.shrimpInventory.shrimpType.name}</td>
                      <td className="py-2">
                        {a.shrimpInventory.quantity.toString()}{" "}
                        {a.shrimpInventory.unit.abbreviation || a.shrimpInventory.unit.name}
                      </td>
                      <td className="py-2">{a.shrimpInventory.user.name || a.shrimpInventory.user.email}</td>
                      <td className="py-2">
                        <ToastActionButton
                          action={unassignShrimpFromPond}
                          actionArg={a.id}
                          successMessage="Assignment removed"
                          errorMessage="Failed to unassign"
                          variant="outline"
                          size="sm"
                          confirmTitle="Unassign shrimp from pond?"
                          confirmDescription="This will remove the assignment."
                        >
                          Unassign
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
