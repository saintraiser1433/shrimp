"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  farmer: "Farmer",
  dashboard: "Dashboard",
  ponds: "Ponds",
  new: "New",
  "shrimp-types": "Shrimp Types",
  "shrimp-units": "Shrimp Units",
  "pond-assignments": "Pond Assignments",
  feeds: "Feeds",
  "feeding-schedules": "Feeding Schedules",
  "shrimp-inventory": "Shrimp Inventory",
  "harvest-performance": "Harvest Performance",
  notifications: "Notifications",
  feeding: "Feeding",
  harvest: "Harvest",
  login: "Login",
};

function getLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (segment.length > 20 || /^[a-z0-9_-]{20,}$/i.test(segment)) return "Detail";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const items = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = getLabel(segment);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => (
          <span key={item.href} className="flex items-center gap-2">
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
