"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateShrimpType } from "@/lib/actions/shrimp-types";

type ShrimpTypeRow = {
  id: string;
  name: string;
  description: string | null;
  defaultFeedingIntervalDays: number | null;
  defaultFeedingQty: string | null;
  defaultFeedingUnitId: string | null;
  expectedHarvestDays: number | null;
  expectedHarvestQty: string | null;
  expectedHarvestUnitId: string | null;
};
type ShrimpUnit = { id: string; name: string; abbreviation: string | null };

export function EditShrimpTypeModal({
  type,
  units,
}: {
  type: ShrimpTypeRow;
  units: ShrimpUnit[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateShrimpType(type.id, formData);
        toast.success("Shrimp type updated");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update shrimp type");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit shrimp type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor={`edit-name-${type.id}`}>Name</Label>
            <Input
              id={`edit-name-${type.id}`}
              name="name"
              required
              defaultValue={type.name}
            />
          </div>
          <div>
            <Label htmlFor={`edit-description-${type.id}`}>Description</Label>
            <Input
              id={`edit-description-${type.id}`}
              name="description"
              defaultValue={type.description ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`edit-defaultFeedingIntervalDays-${type.id}`}>
              Default feed-day spacing (calendar days between feeding days)
            </Label>
            <p className="text-muted-foreground mb-1 text-xs">
              Sessions per day are configured per growth stage (max 3); this field is only calendar
              spacing for defaults/manual schedules.
            </p>
            <Input
              id={`edit-defaultFeedingIntervalDays-${type.id}`}
              name="defaultFeedingIntervalDays"
              type="number"
              min="1"
              defaultValue={type.defaultFeedingIntervalDays ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`edit-defaultFeedingQty-${type.id}`}>Default feeding quantity</Label>
            <Input
              id={`edit-defaultFeedingQty-${type.id}`}
              name="defaultFeedingQty"
              type="number"
              step="0.01"
              defaultValue={type.defaultFeedingQty ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`edit-defaultFeedingUnitId-${type.id}`}>Default feeding unit</Label>
            <select
              id={`edit-defaultFeedingUnitId-${type.id}`}
              name="defaultFeedingUnitId"
              defaultValue={type.defaultFeedingUnitId ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`edit-expectedHarvestDays-${type.id}`}>
              Expected harvest after (days from stocking)
            </Label>
            <Input
              id={`edit-expectedHarvestDays-${type.id}`}
              name="expectedHarvestDays"
              type="number"
              min="1"
              defaultValue={type.expectedHarvestDays ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`edit-expectedHarvestQty-${type.id}`}>Expected harvest quantity</Label>
            <Input
              id={`edit-expectedHarvestQty-${type.id}`}
              name="expectedHarvestQty"
              type="number"
              step="0.01"
              defaultValue={type.expectedHarvestQty ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`edit-expectedHarvestUnitId-${type.id}`}>Expected harvest unit</Label>
            <select
              id={`edit-expectedHarvestUnitId-${type.id}`}
              name="expectedHarvestUnitId"
              defaultValue={type.expectedHarvestUnitId ?? ""}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} {unit.abbreviation ? `(${unit.abbreviation})` : ""}
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
