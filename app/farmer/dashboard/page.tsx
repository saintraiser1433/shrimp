import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function FarmerDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "FARMER")
    redirect("/login");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const alarmWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const [todaysFeedings, alarmFeedings] = await Promise.all([
    prisma.feedingSchedule.findMany({
      where: {
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: "PENDING",
      },
      include: { pond: true, feed: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.feedingSchedule.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { gte: new Date(now.getTime() - 15 * 60 * 1000), lte: alarmWindowEnd },
      },
      include: { pond: true, feed: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return (
    <>
      {alarmFeedings.length > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Feeding alarm</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-sm">
              {alarmFeedings.length} feeding(s) due in the next 30 minutes:
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
                  <li key={s.id} className="flex justify-between text-sm">
                    <span>
                      {s.pond.name} – {s.feed.name}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(s.scheduledAt).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
