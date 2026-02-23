"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAdminProfile } from "@/lib/actions/profile";

type AdminProfileFormProps = {
  name: string | null;
  email: string;
  phone: string | null;
};

export function AdminProfileForm({ name, email, phone }: AdminProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-4 max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          try {
            await updateAdminProfile(formData);
            toast.success("Profile updated");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update profile");
          }
        });
      }}
    >
      <div>
        <Label htmlFor="admin-name">Name</Label>
        <Input
          id="admin-name"
          name="name"
          type="text"
          defaultValue={name ?? ""}
          placeholder="Your name"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          value={email}
          readOnly
          disabled
          className="mt-1 bg-muted"
        />
        <p className="text-muted-foreground text-xs mt-1">Email cannot be changed here.</p>
      </div>
      <div>
        <Label htmlFor="admin-phone">Phone (Philippines +639…)</Label>
        <Input
          id="admin-phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="+639171234567"
          className="mt-1"
        />
        <p className="text-muted-foreground text-xs mt-1">Philippine mobile format, e.g. +639171234567. Leave blank to clear.</p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
