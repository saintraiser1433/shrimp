import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const [pondCount, feedCount, scheduleCount, harvestCount] = await Promise.all([
    prisma.pond.count(),
    prisma.feedsInventory.count(),
    prisma.feedingSchedule.count({ where: { status: "PENDING" } }),
    prisma.harvest.count(),
  ]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ponds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pondCount}</div>
            <p className="text-muted-foreground text-xs">Total ponds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feed types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedCount}</div>
            <p className="text-muted-foreground text-xs">In inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending feedings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduleCount}</div>
            <p className="text-muted-foreground text-xs">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Harvests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{harvestCount}</div>
            <p className="text-muted-foreground text-xs">Total records</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Admin overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage ponds, water maintenance, shrimp types and units, pond assignments,
            feeds inventory, feeding schedules, shrimp inventory, and view harvest
            performance and notifications from the sidebar.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
