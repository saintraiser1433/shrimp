import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTableEmpty } from "@/components/data-table-empty";
import { ToastActionButton } from "@/components/toast-action-button";
import { AddShrimpTypeModal } from "@/components/modals/add-shrimp-type-modal";
import { EditShrimpTypeModal } from "@/components/modals/edit-shrimp-type-modal";
import { deleteShrimpType } from "@/lib/actions/shrimp-types";

export default async function AdminShrimpTypesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const types = await prisma.shrimpType.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shrimp Types</h1>
        <AddShrimpTypeModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shrimp types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <DataTableEmpty message="No shrimp types yet." />
                    </td>
                  </tr>
                ) : (
                  types.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2 font-medium">{t.name}</td>
                      <td className="py-2 text-muted-foreground">{t.description || "—"}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <EditShrimpTypeModal type={{ id: t.id, name: t.name, description: t.description }} />
                          <ToastActionButton
                            action={deleteShrimpType}
                            actionArg={t.id}
                            successMessage="Shrimp type deleted"
                            errorMessage="Failed to delete shrimp type"
                            variant="destructive"
                            size="sm"
                            confirmTitle="Delete shrimp type?"
                            confirmDescription="This action cannot be undone."
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
        </CardContent>
      </Card>
    </>
  );
}
