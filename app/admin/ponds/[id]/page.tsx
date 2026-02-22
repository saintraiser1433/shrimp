import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  completeWaterMaintenance,
  createWaterMaintenance,
  updatePond,
} from "@/lib/actions/ponds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastForm } from "@/components/toast-form";
import { ToastActionButton } from "@/components/toast-action-button";

export default async function PondDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    return null;

  const { id } = await params;
  const pond = await prisma.pond.findUnique({
    where: { id },
    include: {
      waterMaintenanceSchedules: { orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!pond) notFound();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pond.name}</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/ponds">Back to ponds</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit pond</CardTitle>
        </CardHeader>
        <CardContent>
          <ToastForm
            action={updatePond.bind(null, id)}
            successMessage="Pond updated"
            errorMessage="Failed to update pond"
            className="flex max-w-md flex-col gap-4"
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={pond.name} required />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={pond.location ?? ""} />
            </div>
            <div>
              <Label htmlFor="size">Size</Label>
              <Input id="size" name="size" defaultValue={pond.size ?? ""} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                defaultValue={pond.status}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <Button type="submit">Update</Button>
          </ToastForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Water maintenance schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <ToastForm
            action={createWaterMaintenance.bind(null, id)}
            successMessage="Maintenance schedule added"
            errorMessage="Failed to add schedule"
            className="mb-6 flex flex-wrap gap-4"
          >
            <div>
              <Label htmlFor="scheduledAt">Scheduled at</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input id="type" name="type" placeholder="e.g. WATER_CHANGE" required />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Add schedule</Button>
            </div>
          </ToastForm>
          <ul className="space-y-2">
            {pond.waterMaintenanceSchedules.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <span className="font-medium">{s.type}</span> –{" "}
                  {new Date(s.scheduledAt).toLocaleString()}
                  {s.notes && ` – ${s.notes}`}
                  {s.completedAt && (
                    <span className="text-muted-foreground ml-2">(completed)</span>
                  )}
                </div>
                {!s.completedAt && (
                  <ToastActionButton
                    action={completeWaterMaintenance}
                    actionArg={s.id}
                    successMessage="Marked complete"
                    errorMessage="Failed to mark complete"
                    variant="outline"
                    size="sm"
                  >
                    Mark complete
                  </ToastActionButton>
                )}
              </li>
            ))}
          </ul>
          {pond.waterMaintenanceSchedules.length === 0 && (
            <p className="text-muted-foreground">No maintenance schedules yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
