"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateShrimpInventoryStatus } from "@/lib/actions/shrimp-inventory";

const INVENTORY_STATUSES = ["AVAILABLE", "IN_POND", "HARVESTED"] as const;

export function InventoryStatusSelect({
  inventoryId,
  currentStatus,
}: {
  inventoryId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await updateShrimpInventoryStatus(inventoryId, status);
        toast.success("Inventory status updated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border-input bg-background flex h-9 rounded-md border px-3 py-1 text-sm"
        disabled={isPending}
      >
        {INVENTORY_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
