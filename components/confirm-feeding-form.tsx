"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmFeeding } from "@/lib/actions/feeding-confirm";

type ConfirmFeedingFormProps = {
  scheduleId: string;
  defaultQuantity: string;
  isLate?: boolean;
};

export function ConfirmFeedingForm({
  scheduleId,
  defaultQuantity,
  isLate = false,
}: ConfirmFeedingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await confirmFeeding(formData);
        toast.success(isLate ? "Late feeding recorded" : "Feeding confirmed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to confirm feeding");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <div>
        <Label htmlFor={`dispensedQty-${scheduleId}`} className="sr-only">
          Dispensed quantity
        </Label>
        <Input
          id={`dispensedQty-${scheduleId}`}
          name="dispensedQty"
          type="number"
          step="0.01"
          required
          defaultValue={defaultQuantity}
          className="h-8 w-24"
        />
      </div>
      <div>
        <Label htmlFor={`notes-${scheduleId}`} className="sr-only">
          Notes
        </Label>
        <Input
          id={`notes-${scheduleId}`}
          name="notes"
          className="h-8 w-32"
          placeholder="Notes"
        />
      </div>
      {isLate ? (
        <div>
          <Label htmlFor={`lateReason-${scheduleId}`} className="sr-only">
            Late reason
          </Label>
          <Input
            id={`lateReason-${scheduleId}`}
            name="lateReason"
            className="h-8 w-40"
            placeholder="Reason for late feeding"
            required
          />
        </div>
      ) : null}
      <Button type="submit" size="sm" variant={isLate ? "secondary" : "default"} disabled={isPending}>
        {isPending ? "…" : isLate ? "Mark as fed (late)" : "Confirm"}
      </Button>
    </form>
  );
}
