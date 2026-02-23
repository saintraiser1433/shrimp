"use client";

import { ToastActionButton } from "@/components/toast-action-button";
import { requestWaterMaintenanceCompletion } from "@/lib/actions/water-maintenance";

export function RequestWaterMaintenanceCompletionButton({ scheduleId }: { scheduleId: string }) {
  return (
    <ToastActionButton
      action={requestWaterMaintenanceCompletion}
      actionArg={scheduleId}
      successMessage="Completion requested. Waiting for admin approval."
      errorMessage="Failed to request completion"
      variant="outline"
      size="sm"
      confirmTitle="Request completion?"
      confirmDescription="Mark this water maintenance as done? Your request will need admin approval before it is marked complete."
    >
      Request completion
    </ToastActionButton>
  );
}
