import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createPond } from "@/lib/actions/ponds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastForm } from "@/components/toast-form";

export default async function NewPondPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  return (
    <>
      <h1 className="text-2xl font-bold">Add pond</h1>
      <Card>
        <CardHeader>
          <CardTitle>New pond</CardTitle>
        </CardHeader>
        <CardContent>
          <ToastForm
            action={createPond}
            successMessage="Pond created"
            errorMessage="Failed to create pond"
            redirectPath="/admin/ponds"
            className="flex max-w-md flex-col gap-4"
          >
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>
            <div>
              <Label htmlFor="size">Size</Label>
              <Input id="size" name="size" placeholder="e.g. 1000 sqm" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/ponds">Cancel</Link>
              </Button>
            </div>
          </ToastForm>
        </CardContent>
      </Card>
    </>
  );
}
