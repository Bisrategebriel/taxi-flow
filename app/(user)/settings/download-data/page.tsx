"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileJson, Shield, Clock, CreditCard, Navigation2 } from "lucide-react";
import { useState } from "react";

const INCLUDED = [
  { icon: Shield, label: "Account information", desc: "Name, email, phone, addresses" },
  { icon: Navigation2, label: "Trip history", desc: "All past trips with routes and fares" },
  { icon: CreditCard, label: "Payment records", desc: "Payment amounts and methods" },
  { icon: Clock, label: "Account activity", desc: "Account creation date and profile settings" },
];

export default function DownloadDataPage() {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/user/export-data");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxiflow-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Download My Data</h1>
            <p className="text-xs text-muted-foreground">Export a copy of your TaxiFlow data</p>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s included</p>
          </div>
          <div className="divide-y divide-border">
            {INCLUDED.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon size={14} className="text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 flex items-start gap-2">
          <FileJson size={15} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your data will be downloaded as a JSON file. This file contains personal information — store it securely and do not share it with others.
          </p>
        </div>

        {/* Download button */}
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownload}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {downloading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Download size={15} />
          )}
          {downloading ? "Preparing export…" : "Download My Data"}
        </button>
      </div>
    </div>
  );
}
