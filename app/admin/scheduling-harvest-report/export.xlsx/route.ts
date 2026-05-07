import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

function filenameStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const [recentFeedings, activeStockings, recentHarvests] = await Promise.all([
    prisma.feedingSchedule.findMany({
      orderBy: { scheduledAt: "desc" },
      take: 200,
      include: {
        pond: { select: { name: true } },
        shrimpType: { select: { name: true } },
        confirmations: {
          orderBy: { confirmedAt: "desc" },
          take: 1,
          select: {
            confirmedAt: true,
            farmer: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.pondStocking.findMany({
      where: { status: "ACTIVE" },
      orderBy: { stockedAt: "desc" },
      take: 200,
      include: {
        pond: { select: { name: true } },
        shrimpType: { select: { name: true } },
      },
    }),
    prisma.harvest.findMany({
      orderBy: { harvestedAt: "desc" },
      take: 200,
      include: {
        pond: { select: { name: true } },
        unit: { select: { name: true, abbreviation: true } },
      },
    }),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Shrimp Admin";
  wb.created = new Date();

  const info = wb.addWorksheet("Info");
  info.columns = [
    { header: "Key", key: "key", width: 28 },
    { header: "Value", key: "value", width: 60 },
  ];
  info.addRow({ key: "Generated at", value: new Date().toLocaleString() });
  info.addRow({ key: "Report", value: "Scheduling & Harvest Report" });
  info.getRow(1).font = { bold: true };

  const feed = wb.addWorksheet("Recent Feedings");
  feed.columns = [
    { header: "Scheduled At", key: "scheduledAt", width: 22 },
    { header: "Pond", key: "pond", width: 18 },
    { header: "Shrimp Type", key: "shrimpType", width: 18 },
    { header: "Stage", key: "stage", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Last Confirmed At", key: "confirmedAt", width: 22 },
    { header: "Confirmed By", key: "confirmedBy", width: 22 },
  ];
  feed.getRow(1).font = { bold: true };
  for (const f of recentFeedings) {
    const last = f.confirmations[0];
    feed.addRow({
      scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toLocaleString() : "",
      pond: f.pond.name,
      shrimpType: f.shrimpType?.name ?? "",
      stage: f.growthStageName ?? "",
      status: f.status,
      confirmedAt: last?.confirmedAt ? new Date(last.confirmedAt).toLocaleString() : "",
      confirmedBy: last?.farmer ? last.farmer.name || last.farmer.email : "",
    });
  }

  const stockings = wb.addWorksheet("Active Stockings");
  stockings.columns = [
    { header: "Pond", key: "pond", width: 18 },
    { header: "Shrimp Type", key: "shrimpType", width: 18 },
    { header: "Stocked At", key: "stockedAt", width: 16 },
    { header: "Expected Harvest Date", key: "expectedHarvestDate", width: 20 },
    { header: "Expected Harvest Qty", key: "expectedHarvestQty", width: 18 },
  ];
  stockings.getRow(1).font = { bold: true };
  for (const s of activeStockings) {
    stockings.addRow({
      pond: s.pond.name,
      shrimpType: s.shrimpType.name,
      stockedAt: new Date(s.stockedAt).toLocaleDateString(),
      expectedHarvestDate: s.expectedHarvestDate
        ? new Date(s.expectedHarvestDate).toLocaleDateString()
        : "",
      expectedHarvestQty: s.expectedHarvestQty ? s.expectedHarvestQty.toString() : "",
    });
  }

  const harvests = wb.addWorksheet("Recent Harvests");
  harvests.columns = [
    { header: "Harvested At", key: "harvestedAt", width: 22 },
    { header: "Pond", key: "pond", width: 18 },
    { header: "Actual Qty", key: "actualQty", width: 14 },
    { header: "Unit", key: "unit", width: 16 },
  ];
  harvests.getRow(1).font = { bold: true };
  for (const h of recentHarvests) {
    const unitLabel = h.unit.abbreviation || h.unit.name;
    harvests.addRow({
      harvestedAt: new Date(h.harvestedAt).toLocaleString(),
      pond: h.pond.name,
      actualQty: h.actualQty.toString(),
      unit: unitLabel,
    });
  }

  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const now = new Date();
  const filename = `scheduling-harvest-report_${filenameStamp(now)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}

