import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { AreaChartCard } from "@/components/charts/area-chart-card";

export default async function FarmerDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const alarmWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const farmerId = session.user.id;

  const [todaysFeedings, alarmFeedings, myHarvests, myInventory] = await Promise.all([
    prisma.feedingSchedule.findMany({
      where: {
        assignedFarmerId: farmerId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "DELAYED", "MISSED", "COMPLETED"] },
      },
      include: { pond: true, feed: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.feedingSchedule.findMany({
      where: {
        assignedFarmerId: farmerId,
        OR: [
          {
            status: "PENDING",
            scheduledAt: { gte: new Date(now.getTime() - 15 * 60 * 1000), lte: alarmWindowEnd },
          },
          { status: "DELAYED" },
        ],
      },
      include: { pond: true, feed: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.harvest.findMany({
      where: { farmerId: session.user.id, harvestedAt: { gte: sixMonthsAgo } },
      select: { harvestedAt: true, actualQty: true },
    }),
    prisma.shrimpInventory.findMany({
      where: { userId: session.user.id },
      include: { shrimpType: true },
    }),
  ]);

  const monthNames: Record<number, string> = {
    0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun",
    6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec",
  };
  const harvestsByMonth: { name: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const quantity = myHarvests
      .filter((h) => h.harvestedAt >= start && h.harvestedAt <= end)
      .reduce((s, h) => s + Number(h.actualQty), 0);
    harvestsByMonth.push({
      name: `${monthNames[month]} ${year}`,
      value: quantity,
    });
  }

  const inventoryByType = Object.entries(
    myInventory.reduce<Record<string, number>>((acc, i) => {
      const name = i.shrimpType.name;
      acc[name] = (acc[name] ?? 0) + Number(i.quantity);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <>
      {alarmFeedings.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Feeding alarm</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm">
              {alarmFeedings.length} feeding(s) due soon or delayed:
            </p>
            <ul className="mb-4 space-y-1 text-sm">
              {alarmFeedings.map((s) => (
                <li key={s.id}>
                  {s.pond.name} – {s.feed.name} at{" "}
                  {new Date(s.scheduledAt).toLocaleTimeString()}
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link href="/farmer/feeding">Go to feeding</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s feeding schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysFeedings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No feedings scheduled for today.</p>
            ) : (
              <ul className="space-y-2">
                {todaysFeedings.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 text-sm">
                    <span>
                      {s.pond.name} – {s.feed.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-right">
                      <span className="mr-2">{s.status}</span>
                      {new Date(s.scheduledAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AreaChartCard
          title="My harvests (last 6 months)"
          data={harvestsByMonth}
          color="var(--chart-1)"
        />
        <BarChartCard
          title="My inventory by shrimp type"
          data={inventoryByType}
          color="var(--chart-2)"
        />
      </div>
    </>
  );
}
