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
import { declareHarvest } from "@/lib/actions/harvest-declare";

type Pond = { id: string; name: string };
type Unit = { id: string; name: string; abbreviation: string | null };
type Schedule = {
  id: string;
  pond: { name: string };
  scheduledAt: Date;
  estimatedQty: string;
  unitLabel: string;
};

export function DeclareHarvestModal({
  ponds,
  units,
  schedules,
}: {
  ponds: Pond[];
  units: Unit[];
  schedules: Schedule[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? "");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await declareHarvest(formData);
        toast.success("Harvest declared");
        setOpen(false);
        form.reset();
        setSelectedScheduleId("");
        setSelectedUnitId(units[0]?.id ?? "");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to declare harvest");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Declare harvest</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Declare harvest</DialogTitle>
        </DialogHeader>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            No harvest schedules exist yet. An admin must create a harvest schedule for a pond before you can declare a harvest.
          </p>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="pondId">Pond</Label>
            <select
              id="pondId"
              name="pondId"
              required
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="actualQty">Actual quantity</Label>
            <Input id="actualQty" name="actualQty" type="number" step="0.01" required />
            <p className="text-muted-foreground mt-1 text-xs">
              Unit: {selectedUnit?.abbreviation || selectedUnit?.name || "Select a unit"}
            </p>
            {selectedSchedule ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Scheduled estimate: {selectedSchedule.estimatedQty} {selectedSchedule.unitLabel}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="unitId">Unit</Label>
            <select
              id="unitId"
              name="unitId"
              required
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.abbreviation ? `(${u.abbreviation})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="scheduleId">Linked schedule</Label>
            <select
              id="scheduleId"
              name="scheduleId"
              required
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Select a schedule</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pond.name} - {new Date(s.scheduledAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              Required to avoid variance and keep harvests aligned with planned schedules.
            </p>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Declaring…" : "Declare harvest"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
