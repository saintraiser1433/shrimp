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
import { updateFarmer } from "@/lib/actions/farmers";

type FarmerRow = { id: string; name: string | null; email: string };

export function EditFarmerModal({ farmer }: { farmer: FarmerRow }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateFarmer(farmer.id, formData);
        toast.success("Farmer updated");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update farmer");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit farmer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor={`edit-name-${farmer.id}`}>Name</Label>
            <Input
              id={`edit-name-${farmer.id}`}
              name="name"
              defaultValue={farmer.name ?? ""}
              placeholder="Farmer name"
            />
          </div>
          <div>
            <Label htmlFor={`edit-email-${farmer.id}`}>Email</Label>
            <Input
              id={`edit-email-${farmer.id}`}
              name="email"
              type="email"
              required
              defaultValue={farmer.email}
            />
          </div>
          <div>
            <Label htmlFor={`edit-newPassword-${farmer.id}`}>New password (optional)</Label>
            <Input
              id={`edit-newPassword-${farmer.id}`}
              name="newPassword"
              type="password"
              minLength={6}
              placeholder="Leave blank to keep current"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
