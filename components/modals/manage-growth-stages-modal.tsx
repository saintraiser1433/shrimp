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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createGrowthStage,
  deleteGrowthStage,
  updateGrowthStage,
} from "@/lib/actions/shrimp-types";

type Feed = { id: string; name: string };
type Unit = { id: string; name: string; abbreviation: string | null };
type Stage = {
  id: string;
  stageName: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
  feedId: string | null;
  feedQtyPerSession: string;
  feedingSessionsPerDay: number;
  feedUnitId: string | null;
  sortOrder: number;
};

function getSessionTimesLabel(sessionsPerDay: number): string {
  const sessions = Math.min(3, Math.max(1, Math.floor(sessionsPerDay || 1)));
  const startHour = 6;
  const endHour = 18;
  const hours =
    sessions === 1
      ? [Math.floor((startHour + endHour) / 2)]
      : Array.from({ length: sessions }, (_, s) =>
          Math.floor(startHour + ((endHour - startHour) * s) / (sessions - 1)),
        );
  return hours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ");
}

export function ManageGrowthStagesModal({
  shrimpTypeId,
  shrimpTypeName,
  stages,
  feeds,
  units,
}: {
  shrimpTypeId: string;
  shrimpTypeName: string;
  stages: Stage[];
  feeds: Feed[];
  units: Unit[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const router = useRouter();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createGrowthStage(shrimpTypeId, formData);
        toast.success("Growth stage added");
        form.reset();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add stage");
      }
    });
  }

  function handleUpdate(stageId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateGrowthStage(stageId, formData);
        toast.success("Growth stage updated");
        setEditingStageId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update stage");
      }
    });
  }

  function handleDelete(stageId: string) {
    if (!confirm("Delete this growth stage?")) return;
    startTransition(async () => {
      try {
        await deleteGrowthStage(stageId);
        toast.success("Growth stage deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete stage");
      }
    });
  }

  const sortedStages = [...stages].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.startDayFromStocking - b.startDayFromStocking,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Growth stages
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Growth stages — {shrimpTypeName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Existing stages</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Day range</th>
                    <th className="pb-2 font-medium">Feed</th>
                    <th className="pb-2 font-medium">Qty / session</th>
                    <th className="pb-2 font-medium">Sessions / day</th>
                    <th className="pb-2 font-medium">Session times</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-3 text-muted-foreground text-sm">
                        No growth stages defined yet. Add the first stage below.
                      </td>
                    </tr>
                  ) : (
                    sortedStages.map((stage) => {
                      const feedName = feeds.find((f) => f.id === stage.feedId)?.name ?? "—";
                      const unitLabel = units.find((u) => u.id === stage.feedUnitId);
                      const isEditing = editingStageId === stage.id;
                      if (isEditing) {
                        return (
                          <tr key={stage.id} className="border-b align-top">
                            <td colSpan={7} className="py-2">
                              <form
                                onSubmit={(e) => handleUpdate(stage.id, e)}
                                className="grid grid-cols-2 gap-3"
                              >
                                <div>
                                  <Label>Stage name</Label>
                                  <Input
                                    name="stageName"
                                    required
                                    defaultValue={stage.stageName}
                                  />
                                </div>
                                <div>
                                  <Label>Sort order</Label>
                                  <Input
                                    name="sortOrder"
                                    type="number"
                                    defaultValue={stage.sortOrder}
                                  />
                                </div>
                                <div>
                                  <Label>Start day</Label>
                                  <Input
                                    name="startDayFromStocking"
                                    type="number"
                                    min="1"
                                    required
                                    defaultValue={stage.startDayFromStocking}
                                  />
                                </div>
                                <div>
                                  <Label>End day</Label>
                                  <Input
                                    name="endDayFromStocking"
                                    type="number"
                                    min="1"
                                    required
                                    defaultValue={stage.endDayFromStocking}
                                  />
                                </div>
                                <div>
                                  <Label>Feed</Label>
                                  <select
                                    name="feedId"
                                    defaultValue={stage.feedId ?? ""}
                                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                                  >
                                    <option value="">Select feed</option>
                                    {feeds.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label>Feed unit</Label>
                                  <select
                                    name="feedUnitId"
                                    defaultValue={stage.feedUnitId ?? ""}
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
                                <div>
                                  <Label>Qty per session</Label>
                                  <Input
                                    name="feedQtyPerSession"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    defaultValue={stage.feedQtyPerSession}
                                  />
                                </div>
                                <div>
                                  <Label>Sessions per day (max 3)</Label>
                                  <Input
                                    name="feedingSessionsPerDay"
                                    type="number"
                                    min={1}
                                    max={3}
                                    defaultValue={stage.feedingSessionsPerDay}
                                  />
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    Auto time slots: {getSessionTimesLabel(stage.feedingSessionsPerDay)}
                                  </p>
                                </div>
                                <div className="col-span-2 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingStageId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={isPending}>
                                    {isPending ? "Saving…" : "Save stage"}
                                  </Button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={stage.id} className="border-b">
                          <td className="py-2 font-medium">{stage.stageName}</td>
                          <td className="py-2">
                            Day {stage.startDayFromStocking}–{stage.endDayFromStocking}
                          </td>
                          <td className="py-2">{feedName}</td>
                          <td className="py-2">
                            {stage.feedQtyPerSession}
                            {unitLabel ? ` ${unitLabel.abbreviation || unitLabel.name}` : ""}
                          </td>
                          <td className="py-2">{stage.feedingSessionsPerDay}</td>
                          <td className="py-2 text-muted-foreground">
                            {getSessionTimesLabel(stage.feedingSessionsPerDay)}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingStageId(stage.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isPending}
                                onClick={() => handleDelete(stage.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Add new stage</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`new-stageName-${shrimpTypeId}`}>Stage name</Label>
                <Input
                  id={`new-stageName-${shrimpTypeId}`}
                  name="stageName"
                  required
                  placeholder="e.g. Fingerling"
                />
              </div>
              <div>
                <Label htmlFor={`new-sortOrder-${shrimpTypeId}`}>Sort order</Label>
                <Input
                  id={`new-sortOrder-${shrimpTypeId}`}
                  name="sortOrder"
                  type="number"
                  defaultValue="0"
                />
              </div>
              <div>
                <Label htmlFor={`new-startDay-${shrimpTypeId}`}>Start day from stocking</Label>
                <Input
                  id={`new-startDay-${shrimpTypeId}`}
                  name="startDayFromStocking"
                  type="number"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`new-endDay-${shrimpTypeId}`}>End day from stocking</Label>
                <Input
                  id={`new-endDay-${shrimpTypeId}`}
                  name="endDayFromStocking"
                  type="number"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`new-feedId-${shrimpTypeId}`}>Feed</Label>
                <select
                  id={`new-feedId-${shrimpTypeId}`}
                  name="feedId"
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  <option value="">Select feed</option>
                  {feeds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`new-feedUnitId-${shrimpTypeId}`}>Feed unit</Label>
                <select
                  id={`new-feedUnitId-${shrimpTypeId}`}
                  name="feedUnitId"
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
              <div>
                <Label htmlFor={`new-feedQtyPerSession-${shrimpTypeId}`}>Qty per session</Label>
                <Input
                  id={`new-feedQtyPerSession-${shrimpTypeId}`}
                  name="feedQtyPerSession"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`new-feedingSessionsPerDay-${shrimpTypeId}`}>
                  Sessions per day (max 3)
                </Label>
                <Input
                  id={`new-feedingSessionsPerDay-${shrimpTypeId}`}
                  name="feedingSessionsPerDay"
                  type="number"
                  min={1}
                  max={3}
                  defaultValue="1"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Auto time slots: 12:00 (1), 06:00 &amp; 18:00 (2), 06:00 / 12:00 / 18:00 (3)
                </p>
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding…" : "Add stage"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
