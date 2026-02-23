import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSmsSettings } from "@/lib/actions/sms";
import { TestSmsForm } from "@/components/test-sms-form";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN")
    redirect("/login");

  const savedSettings = await getSmsSettings();

  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
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
    </>
  );
}
