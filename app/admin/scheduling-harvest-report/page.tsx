import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEEDING_SCHEDULE_HORIZON_DAYS } from "@/lib/constants/feeding";
import { FEEDING_MISS_GRACE_HOURS } from "@/lib/notifications";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SchedulingHarvestReportPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const [recentFeedings, stockingsWithHarvest, recentHarvests] = await Promise.all([
    prisma.feedingSchedule.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 75,
      include: {
        pond: true,
        shrimpType: true,
        confirmations: {
          orderBy: { confirmedAt: "desc" },
          take: 1,
          include: { farmer: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.pondStocking.findMany({
      where: { status: "ACTIVE" },
      orderBy: { stockedAt: "desc" },
      take: 40,
      include: {
        pond: true,
        shrimpType: true,
      },
    }),
    prisma.harvest.findMany({
      orderBy: { harvestedAt: "desc" },
      take: 40,
      include: { pond: true, unit: true },
    }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scheduling &amp; Harvest Report</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
            Plain-language reference for how feeding statuses, auto-schedules, and harvest expectations are
            derived in code. Numbers below are samples for quick verification—not full exports.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/scheduling-harvest-report/export.xlsx">Export Excel</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feeding schedule lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>PENDING</strong> rows are created ahead of time. Stocking-linked rows use the{' '}
                <strong>growth stage</strong> feed, quantity per session, and sessions per day (capped at 3)
                from <code className="text-xs">generateSchedulesForCurrentStage</code> in{' '}
                <code className="text-xs">lib/actions/pond-stockings.ts</code>.
              </li>
              <li>
                When <code className="text-xs">scheduledAt</code> is in the past, jobs/views running{' '}
                <code className="text-xs">markMissedFeedingsAndNotify</code> move{' '}
                <strong>PENDING → DELAYED</strong> first.
              </li>
              <li>
                After <strong>{FEEDING_MISS_GRACE_HOURS} hours</strong> beyond{' '}
                <code className="text-xs">scheduledAt</code>, <strong>DELAYED → MISSED</strong>; admins get a{' '}
                notification listing affected ponds. When a row first becomes <strong>DELAYED</strong> or{' '}
                <strong>MISSED</strong>, the assigned farmer receives an SMS (if they have a phone on file and
                the SMS gateway is configured), once per transition.
              </li>
              <li>
                Farmers may confirm feedings while <strong>PENDING</strong>, <strong>DELAYED</strong>, or{' '}
                <strong>MISSED</strong>; confirmations carry late flags when applicable (
                <code className="text-xs">lib/actions/feeding-confirm.ts</code>).
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auto-schedule refresh &amp; horizon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                The rolling horizon is <strong>{FEEDING_SCHEDULE_HORIZON_DAYS} days</strong> starting from
                today&apos;s calendar date for each active stocking.
              </li>
              <li>
                Each calendar day inside that window receives up to N slot rows (N = sessions per day for the
                active stage), evenly spaced between 06:00 and 18:00, unless a row already exists for that
                stocking and day.
              </li>
              <li>
                Opening <strong>Admin → Feeding Schedules</strong> or <strong>Farmer → Feeding</strong> runs{' '}
                <code className="text-xs">refreshSchedulesForAllActiveStockings</code>, which calls generation
                for every <strong>ACTIVE</strong> stocking so the horizon stays filled without manual “Generate”
                clicks.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Expected vs actual harvest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                On stocking creation, <code className="text-xs">expectedHarvestDate</code> is{' '}
                <code className="text-xs">stockedAt + shrimpType.expectedHarvestDays</code> when that field is
                set; <code className="text-xs">expectedHarvestQty</code> copies the type default when present (
                <code className="text-xs">createPondStocking</code>).
              </li>
              <li>
                <strong>Ready for harvest</strong> on Pond Stockings (and the admin dashboard tile) turns on
                when either the calendar expected harvest date is on/before today, or the stocking has reached
                the last configured growth stage end day—while status stays <strong>ACTIVE</strong>.
              </li>
              <li>
                Pond Stockings admin lists samples below; cross-check with farmer-declared harvests at the
                bottom for variance versus estimates.
              </li>
              <li>
                Creating a harvest schedule for a pond is blocked server-side while any{' '}
                <strong>SCHEDULED</strong> harvest already exists for that pond (
                <code className="text-xs">createHarvestSchedule</code>).
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent feeding rows (latest 75)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2 font-medium">Scheduled</th>
                <th className="pb-2 font-medium">Pond</th>
                <th className="pb-2 font-medium">Shrimp type</th>
                <th className="pb-2 font-medium">Stage</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Last confirmation</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedings.map((f) => {
                const last = f.confirmations[0];
                return (
                  <tr key={f.id} className="border-b">
                    <td className="py-2">{new Date(f.scheduledAt).toLocaleString()}</td>
                    <td className="py-2">{f.pond.name}</td>
                    <td className="py-2">{f.shrimpType?.name ?? "—"}</td>
                    <td className="py-2">{f.growthStageName ?? "—"}</td>
                    <td className="py-2">
                      <Badge variant="outline">{f.status}</Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {last
                        ? `${new Date(last.confirmedAt).toLocaleString()} (${
                            last.farmer.name || last.farmer.email
                          })`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active stockings &amp; expected harvest (latest 40)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Stocked</th>
                  <th className="pb-2 font-medium">Expected harvest</th>
                </tr>
              </thead>
              <tbody>
                {stockingsWithHarvest.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2">{s.pond.name}</td>
                    <td className="py-2">{s.shrimpType.name}</td>
                    <td className="py-2">{new Date(s.stockedAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      {s.expectedHarvestDate
                        ? new Date(s.expectedHarvestDate).toLocaleDateString()
                        : "—"}
                      {s.expectedHarvestQty ? ` · ${s.expectedHarvestQty.toString()}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent harvest declarations (latest 40)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium">Harvested</th>
                  <th className="pb-2 font-medium">Pond</th>
                  <th className="pb-2 font-medium">Actual qty</th>
                </tr>
              </thead>
              <tbody>
                {recentHarvests.map((h) => (
                  <tr key={h.id} className="border-b">
                    <td className="py-2">{new Date(h.harvestedAt).toLocaleString()}</td>
                    <td className="py-2">{h.pond.name}</td>
                    <td className="py-2">
                      {h.actualQty.toString()}
                      {h.unit.abbreviation || h.unit.name ? ` ${h.unit.abbreviation || h.unit.name}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
