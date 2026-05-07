"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmFeedingForm } from "@/components/confirm-feeding-form";

type StageDefinition = {
  stageName: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
};

type FeedingCalendarItem = {
  id: string;
  pondName: string;
  feedName: string;
  growthStageName: string | null;
  scheduledAtIso: string;
  quantity: string;
  status: string;
  dayFromStocking: number | null;
};

export function FarmerFeedingCalendarModal({
  shrimpTypeName,
  stageDefinitions,
  items,
}: {
  shrimpTypeName: string;
  stageDefinitions: StageDefinition[];
  items: FeedingCalendarItem[];
}) {
  const [open, setOpen] = useState(false);

  const groupedByStage = useMemo(() => {
    const map = new Map<string, FeedingCalendarItem[]>();
    for (const item of items) {
      const key = item.growthStageName || "Unspecified stage";
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    const stageOrder = stageDefinitions.reduce<Record<string, number>>((acc, stage) => {
      acc[stage.stageName] = stage.startDayFromStocking;
      return acc;
    }, {});
    return Array.from(map.entries()).sort((a, b) => {
      const aOrder = stageOrder[a[0]] ?? Number.MAX_SAFE_INTEGER;
      const bOrder = stageOrder[b[0]] ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }, [items, stageDefinitions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Feeding calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Feeding calendar — {shrimpTypeName}</DialogTitle>
        </DialogHeader>
        {groupedByStage.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No feeding schedules found for this inventory&apos;s ponds and shrimp type.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
            {groupedByStage.map(([stageName, stageItems]) => {
              const stageDef = stageDefinitions.find((stage) => stage.stageName === stageName);
              const daysFromDefinition = stageDef
                ? Array.from(
                    { length: stageDef.endDayFromStocking - stageDef.startDayFromStocking + 1 },
                    (_, index) => stageDef.startDayFromStocking + index,
                  )
                : [];
              const groupedByDay = stageItems.reduce<Record<number, FeedingCalendarItem[]>>(
                (acc, item) => {
                  if (typeof item.dayFromStocking !== "number") return acc;
                  acc[item.dayFromStocking] = [...(acc[item.dayFromStocking] ?? []), item];
                  return acc;
                },
                {},
              );
              const daysToRender =
                daysFromDefinition.length > 0
                  ? daysFromDefinition
                  : Object.keys(groupedByDay)
                      .map((value) => Number(value))
                      .sort((a, b) => a - b);

              return (
                <div key={stageName} className="rounded-md border">
                  <div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">
                    Stage: {stageName}
                  </div>
                  <div className="space-y-3 p-3">
                    {daysToRender.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No day entries available for this stage.
                      </p>
                    ) : (
                      daysToRender.map((day) => {
                        const dayItems = groupedByDay[day] ?? [];
                        return (
                          <div key={`${stageName}-day-${day}`} className="rounded border">
                            <div className="border-b px-3 py-2 text-sm font-medium">Day {day}</div>
                            {dayItems.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                No schedule generated for this day yet.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="px-3 py-2 font-medium">Done</th>
                                      <th className="px-3 py-2 font-medium">Time</th>
                                      <th className="px-3 py-2 font-medium">Pond</th>
                                      <th className="px-3 py-2 font-medium">Feed</th>
                                      <th className="px-3 py-2 font-medium">Qty</th>
                                      <th className="px-3 py-2 font-medium">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {dayItems.map((item) => (
                                      <tr
                                        key={item.id}
                                        className="border-b align-top last:border-b-0"
                                      >
                                        <td className="px-3 py-2">
                                          {item.status === "COMPLETED" ? (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border bg-emerald-100 text-emerald-700">
                                              ✓
                                            </span>
                                          ) : (
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border text-muted-foreground" />
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {new Date(item.scheduledAtIso).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </td>
                                        <td className="px-3 py-2">{item.pondName}</td>
                                        <td className="px-3 py-2">{item.feedName}</td>
                                        <td className="px-3 py-2">{item.quantity}</td>
                                        <td className="px-3 py-2">
                                          {item.status === "PENDING" ? (
                                            <ConfirmFeedingForm
                                              scheduleId={item.id}
                                              defaultQuantity={item.quantity}
                                            />
                                          ) : item.status === "DELAYED" ? (
                                            <ConfirmFeedingForm
                                              scheduleId={item.id}
                                              defaultQuantity={item.quantity}
                                              isLate
                                            />
                                          ) : item.status === "MISSED" ? (
                                            <ConfirmFeedingForm
                                              scheduleId={item.id}
                                              defaultQuantity={item.quantity}
                                              isLate
                                            />
                                          ) : (
                                            <Badge variant="secondary">Finished</Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

