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
type Schedule = { id: string; pond: { name: string }; scheduledAt: Date };

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
          </div>
          <div>
            <Label htmlFor="unitId">Unit</Label>
            <select
              id="unitId"
              name="unitId"
              required
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="scheduleId">Linked schedule (optional)</Label>
            <select
              id="scheduleId"
              name="scheduleId"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">None</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pond.name} – {new Date(s.scheduledAt).toLocaleDateString()}
                </option>
              ))}
            </select>
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
      </DialogContent>
    </Dialog>
  );
}
