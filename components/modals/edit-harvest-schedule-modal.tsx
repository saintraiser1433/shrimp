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
import { updateHarvestSchedule } from "@/lib/actions/harvest";

function formatDatetimeLocal(isoOrDate: string | Date): string {
  const d = new Date(isoOrDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type ScheduleRow = {
  id: string;
  shrimpTypeId: string | null;
  scheduledAt: string;
  estimatedQty: string;
  unitId: string;
  farmerId: string | null;
};
type Unit = { id: string; name: string; abbreviation: string | null };
type Farmer = { id: string; name: string | null; email: string };
type ShrimpType = { id: string; name: string };

export function EditHarvestScheduleModal({
  schedule,
  units,
  farmers,
  shrimpTypes,
}: {
  schedule: ScheduleRow;
  units: Unit[];
  farmers: Farmer[];
  shrimpTypes: ShrimpType[];
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
        await updateHarvestSchedule(schedule.id, formData);
        toast.success("Harvest schedule updated");
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
          <DialogTitle>Edit harvest schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor={`edit-harvest-shrimpTypeId-${schedule.id}`}>Shrimp type</Label>
            <select
              id={`edit-harvest-shrimpTypeId-${schedule.id}`}
              name="shrimpTypeId"
              defaultValue={schedule.shrimpTypeId ?? ""}
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
            <Label htmlFor={`edit-harvest-scheduledAt-${schedule.id}`}>Scheduled at</Label>
            <input
              id={`edit-harvest-scheduledAt-${schedule.id}`}
              name="scheduledAt"
              type="datetime-local"
              required
              defaultValue={formatDatetimeLocal(schedule.scheduledAt)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor={`edit-harvest-estimatedQty-${schedule.id}`}>Estimated quantity</Label>
            <input
              id={`edit-harvest-estimatedQty-${schedule.id}`}
              name="estimatedQty"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={schedule.estimatedQty}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor={`edit-harvest-unitId-${schedule.id}`}>Unit</Label>
            <select
              id={`edit-harvest-unitId-${schedule.id}`}
              name="unitId"
              defaultValue={schedule.unitId}
              required
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`edit-harvest-farmerId-${schedule.id}`}>Assign to farmer</Label>
            <select
              id={`edit-harvest-farmerId-${schedule.id}`}
              name="farmerId"
              defaultValue={schedule.farmerId ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Any</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name || farmer.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
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
