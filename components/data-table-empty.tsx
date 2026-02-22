import { Inbox } from "lucide-react";

type DataTableEmptyProps = {
  message: string;
};

export function DataTableEmpty({ message }: DataTableEmptyProps) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12">
      <Inbox className="size-10 shrink-0 opacity-50" aria-hidden />
      <p className="text-center text-sm font-medium">{message}</p>
    </div>
  );
}
