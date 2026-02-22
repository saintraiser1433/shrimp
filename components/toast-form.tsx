"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ToastFormProps = {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  errorMessage?: string;
  className?: string;
  /** If set, navigate here on success instead of refreshing. */
  redirectPath?: string;
  onSuccess?: () => void;
  children: React.ReactNode;
};

export function ToastForm({
  action,
  successMessage,
  errorMessage = "Something went wrong",
  className,
  redirectPath,
  onSuccess,
  children,
}: ToastFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(successMessage);
        if (onSuccess) onSuccess();
        else if (redirectPath) router.push(redirectPath);
        else router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : errorMessage);
      }
    });
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
