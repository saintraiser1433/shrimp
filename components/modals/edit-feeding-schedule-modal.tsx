"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { updateFeedingSchedule } from "@/lib/actions/feeding-schedules";

function formatDatetimeLocal(isoOrDate: string | Date): string {
  const d = new Date(isoOrDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ScheduleRow = {
  id: string;
  scheduledAt: string;
  quantity: string;
  assignedFarmerId: string | null;
};
type Farmer = { id: string; name: string | null; email: string };

export function EditFeedingScheduleModal({
  schedule,
  farmers,
}: {
  schedule: ScheduleRow;
  farmers: Farmer[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateFeedingSchedule(schedule.id, formData);
        toast.success("Schedule updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update schedule");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit feeding schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor={`edit-scheduledAt-${schedule.id}`}>Scheduled at</Label>
            <input
              id={`edit-scheduledAt-${schedule.id}`}
              name="scheduledAt"
              type="datetime-local"
              required
              defaultValue={formatDatetimeLocal(schedule.scheduledAt)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor={`edit-quantity-${schedule.id}`}>Quantity</Label>
            <input
              id={`edit-quantity-${schedule.id}`}
              name="quantity"
              type="number"
              step="0.01"
              required
              defaultValue={schedule.quantity}
              className="border-input bg-background flex h-9 w-24 rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor={`edit-assignedFarmerId-${schedule.id}`}>Assign to farmer</Label>
            <select
              id={`edit-assignedFarmerId-${schedule.id}`}
              name="assignedFarmerId"
              defaultValue={schedule.assignedFarmerId ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Any</option>
              {farmers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
