"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { exportRoutes } from "@/app/(admin)/admin/_actions/routes";

export default function ExportRoutesButton() {
  const [pending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const { csv } = await exportRoutes();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `routes-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button type="button" onClick={handleExport} disabled={pending}
      className="flex items-center gap-1.5 h-9 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors">
      <Download size={14} />
      {pending ? "Exporting…" : "Export"}
    </button>
  );
}
