"use client";

import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ToastActionButtonBaseProps = {
  successMessage: string;
  errorMessage?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  children: React.ReactNode;
  className?: string;
  /** When set, show a confirmation dialog before running the action. */
  confirmTitle?: string;
  confirmDescription?: string;
};

type ToastActionButtonPropsWithoutArg = ToastActionButtonBaseProps & {
  /** Server action reference (pass the function, not a wrapper). */
  action: () => Promise<void>;
  actionArg?: undefined;
};

type ToastActionButtonPropsWithArg<TArg> = ToastActionButtonBaseProps & {
  /** Server action reference (pass the function, not a wrapper). */
  action: (arg: TArg) => Promise<void>;
  /** Optional argument to pass to action (e.g. id). Enables passing server actions from Server Components. */
  actionArg: TArg;
};

export function ToastActionButton<TArg>({
  action,
  actionArg,
  successMessage,
  errorMessage = "Something went wrong",
  variant,
  size,
  children,
  className,
  confirmTitle,
  confirmDescription,
}: ToastActionButtonPropsWithoutArg | ToastActionButtonPropsWithArg<TArg>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function runAction() {
    startTransition(async () => {
      try {
        if (actionArg !== undefined) {
          await (action as (arg: TArg) => Promise<void>)(actionArg as TArg);
        } else {
          await (action as () => Promise<void>)();
        }
        toast.success(successMessage);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : errorMessage);
      }
    });
  }

  const triggerButton = (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
    >
      {isPending ? "…" : children}
    </Button>
  );

  if (confirmTitle ?? confirmDescription) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle ?? "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription ?? "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              size={size}
              onClick={runAction}
              disabled={isPending}
            >
              {isPending ? "…" : "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      onClick={runAction}
    >
      {isPending ? "…" : children}
    </Button>
  );
}
