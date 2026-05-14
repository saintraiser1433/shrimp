"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPondStocking } from "@/lib/actions/pond-stockings";
import { computeExpectedHarvestFromStocking } from "@/lib/expected-harvest";

type Pond = { id: string; name: string };
type Unit = { id: string; name: string; abbreviation: string | null };
type Farmer = { id: string; name: string | null; email: string };
type ShrimpTypeOption = {
  id: string;
  name: string;
  expectedHarvestDays: number | null;
  expectedHarvestQty: string | null;
  expectedHarvestUnitLabel: string | null;
};

function todayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function CreatePondStockingModal({
  ponds,
  shrimpTypes,
  units,
  farmers,
}: {
  ponds: Pond[];
  shrimpTypes: ShrimpTypeOption[];
  units: Unit[];
  farmers: Farmer[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedShrimpTypeId, setSelectedShrimpTypeId] = useState("");
  const [stockedAt, setStockedAt] = useState(() => todayDateString());
  const router = useRouter();

  const selectedShrimpType = useMemo(
    () => shrimpTypes.find((s) => s.id === selectedShrimpTypeId) ?? null,
    [shrimpTypes, selectedShrimpTypeId],
  );

  const expectedHarvestPreview = useMemo(() => {
    if (!selectedShrimpType || !stockedAt) return null;
    const stockedAtDate = new Date(stockedAt);
    if (Number.isNaN(stockedAtDate.getTime())) return null;
    return computeExpectedHarvestFromStocking({
      stockedAt: stockedAtDate,
      expectedHarvestDays: selectedShrimpType.expectedHarvestDays,
      expectedHarvestQty: selectedShrimpType.expectedHarvestQty,
    });
  }, [selectedShrimpType, stockedAt]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createPondStocking(formData);
        toast.success("Pond stocking recorded and feeding schedules generated");
        setOpen(false);
        form.reset();
        setSelectedShrimpTypeId("");
        setStockedAt(todayDateString());
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to record stocking");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setStockedAt(todayDateString());
      }}
    >
      <DialogTrigger asChild>
        <Button>Record stocking</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record pond stocking</DialogTitle>
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
              <option value="">Select pond</option>
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="shrimpTypeId">Shrimp type</Label>
            <select
              id="shrimpTypeId"
              name="shrimpTypeId"
              required
              value={selectedShrimpTypeId}
              onChange={(e) => setSelectedShrimpTypeId(e.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Select shrimp type</option>
              {shrimpTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {selectedShrimpType ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Expected harvest:{" "}
                {selectedShrimpType.expectedHarvestQty
                  ? `${selectedShrimpType.expectedHarvestQty}${
                      selectedShrimpType.expectedHarvestUnitLabel
                        ? ` ${selectedShrimpType.expectedHarvestUnitLabel}`
                        : ""
                    }`
                  : "not set"}
                {selectedShrimpType.expectedHarvestDays
                  ? ` after ${selectedShrimpType.expectedHarvestDays} days`
                  : ""}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="stockedAt">Stocked at</Label>
            <input
              id="stockedAt"
              name="stockedAt"
              type="date"
              required
              value={stockedAt}
              onChange={(e) => setStockedAt(e.target.value)}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            />
          </div>
          {selectedShrimpType && expectedHarvestPreview ? (
            <div className="bg-muted/50 rounded-md border px-3 py-2 text-sm">
              <p className="text-foreground font-medium">Expected harvest (saved on this stocking)</p>
              <ul className="text-muted-foreground mt-1 space-y-1 pl-4 text-xs list-disc">
                <li>
                  Target date:{" "}
                  {expectedHarvestPreview.expectedHarvestDate
                    ? expectedHarvestPreview.expectedHarvestDate.toLocaleDateString()
                    : "— (add harvest days on the shrimp type)"}
                </li>
                <li>
                  Est. harvest quantity:{" "}
                  {expectedHarvestPreview.expectedHarvestQty
                    ? `${expectedHarvestPreview.expectedHarvestQty}${
                        selectedShrimpType.expectedHarvestUnitLabel
                          ? ` ${selectedShrimpType.expectedHarvestUnitLabel}`
                          : ""
                      }`
                    : "— (add default harvest qty on the shrimp type)"}
                </li>
              </ul>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="initialQuantity">Initial quantity</Label>
              <Input
                id="initialQuantity"
                name="initialQuantity"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="initialUnitId">Unit</Label>
              <select
                id="initialUnitId"
                name="initialUnitId"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.abbreviation ? ` (${u.abbreviation})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="assignedFarmerId">Assign to farmer</Label>
            <select
              id="assignedFarmerId"
              name="assignedFarmerId"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
            >
              <option value="">Any</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || f.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Record stocking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
