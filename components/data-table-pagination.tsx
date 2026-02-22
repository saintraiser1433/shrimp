"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [10, 20, 50] as const;

type DataTablePaginationProps = {
  totalCount: number;
  currentPage: number;
  pageSize: number;
};

export function DataTablePagination({
  totalCount,
  currentPage,
  pageSize,
}: DataTablePaginationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);
  const page = Math.max(1, Math.min(currentPage, totalPages));

  function buildUrl(updates: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.page !== undefined) params.set("page", String(updates.page));
    if (updates.pageSize !== undefined) params.set("pageSize", String(updates.pageSize));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  function goToPage(p: number) {
    router.push(buildUrl({ page: p }));
  }

  function onPageSizeChange(value: string) {
    const newSize = Number(value);
    router.push(buildUrl({ page: 1, pageSize: newSize }));
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Rows per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={onPageSizeChange}
        >
          <SelectTrigger className="h-8 w-[70px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => goToPage(1)}
          disabled={page <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => goToPage(totalPages)}
          disabled={page >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
