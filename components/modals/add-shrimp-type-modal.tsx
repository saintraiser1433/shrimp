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
import { createShrimpType } from "@/lib/actions/shrimp-types";

type ShrimpUnit = { id: string; name: string; abbreviation: string | null };

export function AddShrimpTypeModal({ units }: { units: ShrimpUnit[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createShrimpType(formData);
        toast.success("Shrimp type added");
        setOpen(false);
        form.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add shrimp type");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add type</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New shrimp type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div>
            <Label htmlFor="defaultFeedingIntervalDays">Default feeding interval (days)</Label>
            <Input
              id="defaultFeedingIntervalDays"
              name="defaultFeedingIntervalDays"
              type="number"
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="defaultFeedingQty">Default feeding quantity</Label>
            <Input id="defaultFeedingQty" name="defaultFeedingQty" type="number" step="0.01" />
          </div>
          <div>
            <Label htmlFor="defaultFeedingUnitId">Default feeding unit</Label>
            <select
              id="defaultFeedingUnitId"
              name="defaultFeedingUnitId"
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
              {isPending ? "Adding…" : "Add type"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
