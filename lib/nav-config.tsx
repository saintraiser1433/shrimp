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
  { title: "Pond Stockings", url: "/admin/pond-stockings", iconName: "Layers" },
  { title: "Feeds Inventory", url: "/admin/feeds", iconName: "Package" },
  { title: "Feeding Schedules", url: "/admin/feeding-schedules", iconName: "CalendarClock" },
  { title: "Shrimp Inventory", url: "/admin/shrimp-inventory", iconName: "Warehouse" },
  { title: "Harvest Performance", url: "/admin/harvest-performance", iconName: "BarChart3" },
  {
    title: "Scheduling & Harvest Report",
    url: "/admin/scheduling-harvest-report",
    iconName: "FileText",
  },
  { title: "Harvest Schedules", url: "/admin/harvest-schedules", iconName: "CalendarCheck" },
  { title: "Farmers", url: "/admin/farmers", iconName: "Users" },
  { title: "Notifications", url: "/admin/notifications", iconName: "Bell" },
  { title: "Settings", url: "/admin/settings", iconName: "Settings" },
];

export function getFarmerNavItems(
  feedingAlarmCount: number,
  notificationUnreadCount: number,
): NavItem[] {
  void feedingAlarmCount;
  return [
    { title: "Dashboard", url: "/farmer/dashboard", iconName: "LayoutDashboard" },
    { title: "My Shrimp Inventory", url: "/farmer/shrimp-inventory", iconName: "Warehouse" },
    { title: "Water maintenance", url: "/farmer/water-maintenance", iconName: "Droplets" },
    { title: "Harvest", url: "/farmer/harvest", iconName: "CalendarCheck" },
    {
      title: "Notifications",
      url: "/farmer/notifications",
      iconName: "Bell",
      badgeCount: notificationUnreadCount,
    },
  ];
}
