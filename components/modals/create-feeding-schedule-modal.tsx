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
import { Label } from "@/components/ui/label";
import { createFeedingSchedule } from "@/lib/actions/feeding-schedules";

type Pond = { id: string; name: string };
type Feed = { id: string; name: string };
type Farmer = { id: string; name: string | null; email: string };

export function CreateFeedingScheduleModal({
  ponds,
  feeds,
  farmers,
}: {
  ponds: Pond[];
  feeds: Feed[];
  farmers: Farmer[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createFeedingSchedule(formData);
        toast.success("Feeding schedule created");
        setOpen(false);
        form.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create schedule");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create schedule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create feeding schedule</DialogTitle>
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
            <Label htmlFor="feedId">Feed</Label>
            <select
              id="feedId"
              name="feedId"
              required
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {feeds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="scheduledAt">Scheduled at</Label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              required
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              required
              className="border-input bg-background flex h-9 w-24 rounded-md border px-3 py-1 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="assignedFarmerId">Assign to farmer</Label>
            <select
              id="assignedFarmerId"
              name="assignedFarmerId"
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
              {isPending ? "Creating…" : "Create schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
