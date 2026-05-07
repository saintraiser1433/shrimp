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
import { createShrimpInventory } from "@/lib/actions/shrimp-inventory";

type ShrimpGrowthStage = {
  id: string;
  stageName: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
  feedName: string | null;
  feedQtyPerSession: string;
  feedingSessionsPerDay: number;
  feedUnitLabel: string | null;
};
type ShrimpType = {
  id: string;
  name: string;
  defaultFeedingIntervalDays: number | null;
  defaultFeedingQty: string | null;
  defaultFeedingUnitLabel: string | null;
  expectedHarvestDays: number | null;
  expectedHarvestQty: string | null;
  expectedHarvestUnitLabel: string | null;
  growthStages: ShrimpGrowthStage[];
};
type ShrimpUnit = { id: string; name: string };

export function CreateShrimpInventoryModal({
  types,
  units,
}: {
  types: ShrimpType[];
  units: ShrimpUnit[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTypeId, setSelectedTypeId] = useState(types[0]?.id ?? "");
  const selectedType =
    types.find((type) => type.id === selectedTypeId) ?? types[0] ?? null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createShrimpInventory(formData);
        toast.success("Inventory entry added");
        setOpen(false);
        form.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add inventory");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add inventory</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create shrimp inventory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="shrimpTypeId">Shrimp type</Label>
            <select
              id="shrimpTypeId"
              name="shrimpTypeId"
              required
              value={selectedTypeId}
              onChange={(event) => setSelectedTypeId(event.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              {types.length === 0 ? <option value="">No shrimp types yet</option> : null}
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {selectedType ? (
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Selected type details</p>
              <p className="text-muted-foreground mt-1">
                Default feeding:{" "}
                {selectedType.defaultFeedingQty
                  ? `${selectedType.defaultFeedingQty}${
                      selectedType.defaultFeedingUnitLabel
                        ? ` ${selectedType.defaultFeedingUnitLabel}`
                        : ""
                    }${
                      selectedType.defaultFeedingIntervalDays
                        ? ` every ${selectedType.defaultFeedingIntervalDays} day${
                            selectedType.defaultFeedingIntervalDays === 1 ? "" : "s"
                          }`
                        : ""
                    }`
                  : "Not set"}
              </p>
              <p className="text-muted-foreground">
                Expected harvest:{" "}
                {selectedType.expectedHarvestQty || selectedType.expectedHarvestDays
                  ? `${selectedType.expectedHarvestQty ?? "?"}${
                      selectedType.expectedHarvestUnitLabel
                        ? ` ${selectedType.expectedHarvestUnitLabel}`
                        : ""
                    }${
                      selectedType.expectedHarvestDays
                        ? ` after ${selectedType.expectedHarvestDays} days`
                        : ""
                    }`
                  : "Not set"}
              </p>
              <div className="mt-2">
                <p className="text-muted-foreground mb-1">
                  Growth levels ({selectedType.growthStages.length})
                </p>
                {selectedType.growthStages.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No growth stages configured.</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto rounded border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-1 text-left font-medium">Stage</th>
                          <th className="px-2 py-1 text-left font-medium">Day</th>
                          <th className="px-2 py-1 text-left font-medium">Feed</th>
                          <th className="px-2 py-1 text-left font-medium">Qty/session</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedType.growthStages.map((stage) => (
                          <tr key={stage.id} className="border-b last:border-b-0">
                            <td className="px-2 py-1">{stage.stageName}</td>
                            <td className="px-2 py-1">
                              {stage.startDayFromStocking}-{stage.endDayFromStocking}
                            </td>
                            <td className="px-2 py-1">{stage.feedName ?? "—"}</td>
                            <td className="px-2 py-1">
                              {stage.feedQtyPerSession}
                              {stage.feedUnitLabel ? ` ${stage.feedUnitLabel}` : ""} ×{" "}
                              {stage.feedingSessionsPerDay}/day
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
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
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue="AVAILABLE"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="AVAILABLE">Available</option>
              <option value="IN_POND">In Pond</option>
              <option value="HARVESTED">Harvested</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
