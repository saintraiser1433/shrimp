// Serializable nav config (icon as string) so Server Components can pass to Client Components.
export type NavItem = {
  title: string;
  url: string;
  iconName: string;
  isActive?: boolean;
  items?: { title: string; url: string }[];
  badgeCount?: number;
};

export const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", iconName: "LayoutDashboard" },
  { title: "Ponds & Water Maintenance", url: "/admin/ponds", iconName: "Droplets" },
  { title: "Shrimp Types", url: "/admin/shrimp-types", iconName: "Fish" },
  { title: "Shrimp Units", url: "/admin/shrimp-units", iconName: "Scale" },
  { title: "Pond Assignments", url: "/admin/pond-assignments", iconName: "Link2" },
  { title: "Feeds Inventory", url: "/admin/feeds", iconName: "Package" },
  { title: "Feeding Schedules", url: "/admin/feeding-schedules", iconName: "CalendarClock" },
  { title: "Shrimp Inventory", url: "/admin/shrimp-inventory", iconName: "Warehouse" },
  { title: "Harvest Performance", url: "/admin/harvest-performance", iconName: "BarChart3" },
  { title: "Notifications", url: "/admin/notifications", iconName: "Bell" },
];

export function getFarmerNavItems(feedingAlarmCount: number): NavItem[] {
  return [
    { title: "Dashboard", url: "/farmer/dashboard", iconName: "LayoutDashboard" },
    { title: "My Shrimp Inventory", url: "/farmer/shrimp-inventory", iconName: "Warehouse" },
    {
      title: "Feeding",
      url: "/farmer/feeding",
      iconName: "CalendarClock",
      badgeCount: feedingAlarmCount > 0 ? feedingAlarmCount : undefined,
    },
    { title: "Harvest", url: "/farmer/harvest", iconName: "CalendarCheck" },
  ];
}
