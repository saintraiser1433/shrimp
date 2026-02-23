import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSmsSettings } from "@/lib/actions/sms";
import { TestSmsForm } from "@/components/test-sms-form";
import { AdminProfileForm } from "@/components/admin-profile-form";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const [savedSettings, currentUser] = await Promise.all([
    getSmsSettings(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    }),
  ]);

  if (!currentUser) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <p className="text-muted-foreground text-sm">
            Update your name and phone number. Phone must be Philippine format (+639…).
          </p>
        </CardHeader>
        <CardContent>
          <AdminProfileForm
            name={currentUser.name}
            email={currentUser.email}
            phone={currentUser.phone}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>SMS Gateway</CardTitle>
          <p className="text-muted-foreground text-sm">
            Save gateway URL, username, and password to reuse when sending SMS from other parts of the app. Use a Philippine number (+639…) for testing.
          </p>
        </CardHeader>
        <CardContent>
          <TestSmsForm initialData={savedSettings} />
        </CardContent>
      </Card>
    </div>
  );
}
