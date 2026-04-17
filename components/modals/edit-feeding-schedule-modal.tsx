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
import {
  getShrimpTypeDefaults,
  updateFeedingSchedule,
} from "@/lib/actions/feeding-schedules";

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
  shrimpTypeId: string | null;
  shrimpTypeDefaultUnitLabel: string | null;
};
type Farmer = { id: string; name: string | null; email: string };
type ShrimpType = { id: string; name: string };

export function EditFeedingScheduleModal({
  schedule,
  farmers,
  shrimpTypes,
}: {
  schedule: ScheduleRow;
  farmers: Farmer[];
  shrimpTypes: ShrimpType[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [selectedShrimpTypeId, setSelectedShrimpTypeId] = useState(schedule.shrimpTypeId ?? "");
  const [quantity, setQuantity] = useState(schedule.quantity);
  const [defaultUnitLabel, setDefaultUnitLabel] = useState<string | null>(
    schedule.shrimpTypeDefaultUnitLabel
  );

  function handleShrimpTypeChange(shrimpTypeId: string) {
    setSelectedShrimpTypeId(shrimpTypeId);
    startTransition(async () => {
      try {
        const defaults = await getShrimpTypeDefaults(shrimpTypeId);
        if (defaults?.defaultFeedingQty) {
          setQuantity(defaults.defaultFeedingQty);
        }
        setDefaultUnitLabel(
          defaults?.defaultFeedingUnit
            ? defaults.defaultFeedingUnit.abbreviation || defaults.defaultFeedingUnit.name
            : null
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load shrimp type defaults");
      }
    });
  }

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
            <Label htmlFor={`edit-shrimpTypeId-${schedule.id}`}>Shrimp type</Label>
            <select
              id={`edit-shrimpTypeId-${schedule.id}`}
              name="shrimpTypeId"
              value={selectedShrimpTypeId}
              onChange={(e) => handleShrimpTypeChange(e.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Select shrimp type</option>
              {shrimpTypes.map((shrimpType) => (
                <option key={shrimpType.id} value={shrimpType.id}>
                  {shrimpType.name}
                </option>
              ))}
            </select>
          </div>
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
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="border-input bg-background flex h-9 w-24 rounded-md border px-3 py-1 text-sm"
            />
            {defaultUnitLabel ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Default quantity unit for this shrimp type: {defaultUnitLabel}
              </p>
            ) : null}
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
