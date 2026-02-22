import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableEmpty } from "@/components/data-table-empty";
import { AddFeedModal } from "@/components/modals/add-feed-modal";
import { checkLowStockAndNotify } from "@/lib/notifications";

export default async function AdminFeedsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  await checkLowStockAndNotify();

  const [feeds, units] = await Promise.all([
    prisma.feedsInventory.findMany({
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.shrimpUnit.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feeds Inventory</h1>
        <AddFeedModal units={units.map((u) => ({ id: u.id, name: u.name }))} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Quantity</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Restock below</th>
                </tr>
              </thead>
              <tbody>
                {feeds.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <DataTableEmpty message="No feeds in inventory yet." />
                    </td>
                  </tr>
                ) : (
                  feeds.map((f) => (
                    <tr key={f.id} className="border-b">
                      <td className="py-2 font-medium">{f.name}</td>
                      <td className="py-2">{f.quantity.toString()}</td>
                      <td className="py-2">{f.unit.abbreviation || f.unit.name}</td>
                      <td className="py-2 text-muted-foreground">
                        {f.restockThreshold != null ? f.restockThreshold.toString() : "—"}
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
