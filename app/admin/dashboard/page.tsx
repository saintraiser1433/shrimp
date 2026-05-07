import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { AreaChartCard } from "@/components/charts/area-chart-card";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    pondCount,
    feedCount,
    scheduleCount,
    harvestCount,
    harvestsWithPond,
    feedingByStatus,
    harvestsLast6Months,
    activeStockingsForHarvestReadiness,
  ] = await Promise.all([
    prisma.pond.count(),
    prisma.feedsInventory.count(),
    prisma.feedingSchedule.count({
      where: { status: { in: ["PENDING", "DELAYED"] } },
    }),
    prisma.harvest.count(),
    prisma.harvest.findMany({
      include: { pond: true },
      orderBy: { harvestedAt: "desc" },
      take: 500,
    }),
    prisma.feedingSchedule.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.harvest.findMany({
      where: { harvestedAt: { gte: sixMonthsAgo } },
      select: { harvestedAt: true, actualQty: true },
    }),
    prisma.pondStocking.findMany({
      where: { status: "ACTIVE" },
      select: {
        stockedAt: true,
        expectedHarvestDate: true,
        shrimpType: {
          select: {
            growthStages: { select: { endDayFromStocking: true } },
          },
        },
      },
    }),
  ]);

  function startOfCalendarDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const todayStartHarvest = startOfCalendarDay(new Date());
  let readyForHarvestStockings = 0;
  for (const s of activeStockingsForHarvestReadiness) {
    const dayFromStocking =
      Math.floor(
        (todayStartHarvest.getTime() - startOfCalendarDay(s.stockedAt).getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1;
    const lastStageEndDay = s.shrimpType.growthStages.reduce(
      (max, st) => Math.max(max, st.endDayFromStocking),
      0,
    );
    const readyByStage =
      lastStageEndDay > 0 && dayFromStocking >= lastStageEndDay;
    const readyByExpected =
      s.expectedHarvestDate != null &&
      startOfCalendarDay(s.expectedHarvestDate).getTime() <= todayStartHarvest.getTime();
    if (readyByStage || readyByExpected) {
      readyForHarvestStockings += 1;
    }
  }

  const harvestByPond = Object.entries(
    harvestsWithPond.reduce<Record<string, number>>((acc, h) => {
      const name = h.pond.name;
      acc[name] = (acc[name] ?? 0) + Number(h.actualQty);
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const monthNames: Record<number, string> = {
    0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun",
    6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec",
  };
  const harvestsByMonth: { name: string; count: number; quantity: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const inMonth = harvestsLast6Months.filter(
      (h) => h.harvestedAt >= start && h.harvestedAt <= end
    );
    harvestsByMonth.push({
      name: `${monthNames[month]} ${year}`,
      count: inMonth.length,
      quantity: inMonth.reduce((s, h) => s + Number(h.actualQty), 0),
    });
  }

  const feedingStatusData = [
    { name: "Pending", value: feedingByStatus.find((s) => s.status === "PENDING")?._count.id ?? 0 },
    { name: "Delayed", value: feedingByStatus.find((s) => s.status === "DELAYED")?._count.id ?? 0 },
    { name: "Completed", value: feedingByStatus.find((s) => s.status === "COMPLETED")?._count.id ?? 0 },
    { name: "Missed", value: feedingByStatus.find((s) => s.status === "MISSED")?._count.id ?? 0 },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <p className="text-muted-foreground text-xs">Pending + delayed</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ready for harvest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForHarvestStockings}</div>
            <p className="text-muted-foreground text-xs">Active stockings due</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BarChartCard
          title="Harvest quantity by pond (top 10)"
          data={harvestByPond}
          color="var(--chart-1)"
        />
        <AreaChartCard
          title="Harvests over last 6 months"
          data={harvestsByMonth.map((m) => ({ name: m.name, value: m.quantity }))}
          color="var(--chart-2)"
        />
      </div>

      <BarChartCard
        title="Feeding schedule status"
        data={feedingStatusData}
        color="var(--chart-3)"
      />

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
