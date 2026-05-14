/**
 * Expected harvest for a pond stocking is derived from the shrimp type:
 * - expected harvest date = stockedAt + expectedHarvestDays (when days > 0)
 * - expected harvest quantity = type default expectedHarvestQty (when set)
 */

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function harvestQtyToString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}

export function computeExpectedHarvestFromStocking(input: {
  stockedAt: Date;
  expectedHarvestDays: number | null | undefined;
  expectedHarvestQty: unknown;
}): { expectedHarvestDate: Date | null; expectedHarvestQty: string | null } {
  const days = input.expectedHarvestDays;
  const expectedHarvestDate =
    days != null && days > 0 ? addDays(input.stockedAt, days) : null;
  const expectedHarvestQty = harvestQtyToString(input.expectedHarvestQty);
  return { expectedHarvestDate, expectedHarvestQty };
}
