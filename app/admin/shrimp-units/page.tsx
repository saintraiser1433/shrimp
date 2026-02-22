import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { ToastActionButton } from "@/components/toast-action-button";
import { AddShrimpUnitModal } from "@/components/modals/add-shrimp-unit-modal";
import { deleteShrimpUnit } from "@/lib/actions/shrimp-units";

export default async function AdminShrimpUnitsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const units = await prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shrimp Units</h1>
        <AddShrimpUnitModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Units (e.g. Kilo, Grams)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Abbreviation</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <DataTableEmpty message="No units yet." />
                    </td>
                  </tr>
                ) : (
                  units.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 font-medium">{u.name}</td>
                      <td className="py-2 text-muted-foreground">{u.abbreviation || "—"}</td>
                      <td className="py-2">
                        <ToastActionButton
                          action={deleteShrimpUnit}
                          actionArg={u.id}
                          successMessage="Unit deleted"
                          errorMessage="Failed to delete unit"
                          variant="destructive"
                          size="sm"
                          confirmTitle="Delete unit?"
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
