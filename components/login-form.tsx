"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Droplets, Fish, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect by role
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as { role?: string }).role;
      router.replace(role === "ADMIN" ? "/admin/dashboard" : "/farmer/dashboard");
    }
  }, [session, status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        toast.error("Invalid email or password.");
        setLoading(false);
        return;
      }
      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Panso Nestor Sherald Shrimp Farming Management System
                </p>
              </div>
              {error && (
                <p className="text-destructive text-center text-sm">{error}</p>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in…" : "Login"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Sign in with your account
              </FieldSeparator>
              <FieldDescription className="text-center">
                Contact your admin if you don&apos;t have an account.
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted/80 flex hidden flex-col justify-center gap-6 p-8 md:flex md:p-10">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                <Fish className="size-6" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Shrimp Farming Management</h2>
                <p className="text-muted-foreground text-sm">Ponds, feeding, harvest & inventory in one place</p>
              </div>
            </div>
            <ul className="text-muted-foreground flex flex-col gap-3 text-sm">
              <li className="flex items-center gap-2">
                <Droplets className="text-primary size-4 shrink-0" />
                Ponds & water maintenance schedules
              </li>
              <li className="flex items-center gap-2">
                <Package className="text-primary size-4 shrink-0" />
                Feeding schedules and feed inventory
              </li>
              <li className="flex items-center gap-2">
                <Fish className="text-primary size-4 shrink-0" />
                Shrimp types, units and pond assignments
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="text-primary size-4 shrink-0" />
                Harvest tracking and performance
              </li>
            </ul>
            <p className="text-muted-foreground border-border border-t pt-4 text-xs">
              Sign in to manage your farm, confirm feedings, declare harvests, and view notifications.
            </p>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By signing in, you agree to use this system for farm management only.
      </FieldDescription>
    </div>
  );
}
