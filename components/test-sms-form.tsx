"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestSms, saveSmsSettings, type SmsSettings } from "@/lib/actions/sms";

const DEFAULT_GATEWAY_URL = "http://192.168.1.1:8080";
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "password";
const DEFAULT_PHONE = "+639171234567";

export function TestSmsForm({ initialData }: { initialData: SmsSettings | null }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const gatewayUrl = initialData?.gatewayUrl ?? DEFAULT_GATEWAY_URL;
  const username = initialData?.username ?? DEFAULT_USERNAME;
  const password = initialData?.password ?? DEFAULT_PASSWORD;
  const phone = initialData?.testPhone ?? DEFAULT_PHONE;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const action = formData.get("action");
    if (action === "save") {
      startTransition(async () => {
        const result = await saveSmsSettings(formData);
        if (result.ok) {
          toast.success("Settings saved. Other components will use these to send SMS.");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
      return;
    }
    if (action === "send") {
      const code = (formData.get("code") as string)?.trim();
      if (!code) {
        toast.error("Enter a message to send.");
        return;
      }
      startTransition(async () => {
        const result = await sendTestSms(formData);
        if (result.ok) {
          toast.success("Test SMS sent.");
        } else {
          toast.error(result.error);
        }
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <div>
        <Label htmlFor="gatewayUrl">Gateway URL</Label>
        <Input
          id="gatewayUrl"
          name="gatewayUrl"
          type="url"
          placeholder={DEFAULT_GATEWAY_URL}
          defaultValue={gatewayUrl}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder={DEFAULT_USERNAME}
          defaultValue={username}
          required
          className="mt-1"
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder={DEFAULT_PASSWORD}
          defaultValue={password}
          required
          className="mt-1"
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone number (Philippines +639…)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder={DEFAULT_PHONE}
          defaultValue={phone}
          required
          className="mt-1"
        />
        <p className="text-muted-foreground text-xs mt-1">Saved as default test number and used when sending from other components.</p>
      </div>
      <div>
        <Label htmlFor="code">Code / message (for test only)</Label>
        <Input
          id="code"
          name="code"
          type="text"
          placeholder="Your test message or code"
          className="mt-1"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="action" value="save" variant="secondary" disabled={isPending}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
        <Button type="submit" name="action" value="send" disabled={isPending}>
          {isPending ? "Sending…" : "Send test SMS"}
        </Button>
      </div>
    </form>
  );
}
