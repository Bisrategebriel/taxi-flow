"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { importTerminals } from "@/app/(admin)/admin/_actions/terminals";

type ParsedTerminal = { name: string; city: string; lat: number; lng: number };
type ImportResult = { name: string; success: boolean; error?: string };

function parseCSV(text: string): { rows: ParsedTerminal[]; error: string | null } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "CSV needs a header row and at least one data row." };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  if (!headers.includes("name") || !headers.includes("lat") || !headers.includes("lng")) {
    return { rows: [], error: 'CSV must have "name", "lat", and "lng" columns.' };
  }

  const get = (vals: string[], key: string) => vals[headers.indexOf(key)]?.trim().replace(/^"|"$/g, "") ?? "";

  const rows: ParsedTerminal[] = [];
  for (const line of lines.slice(1)) {
    const vals = line.split(",");
    const name = get(vals, "name");
    const lat = parseFloat(get(vals, "lat"));
    const lng = parseFloat(get(vals, "lng"));
    if (!name) continue;
    rows.push({ name, city: get(vals, "city"), lat, lng });
  }
  return { rows, error: null };
}

export default function ImportTerminalsButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [rows, setRows] = useState<ParsedTerminal[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload"); setRows([]); setResults([]); setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  }
  function handleClose() { setOpen(false); setTimeout(reset, 300); }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, error } = parseCSV(ev.target?.result as string);
      if (error) { setParseError(error); setRows([]); }
      else { setParseError(null); setRows(parsed); setStep("preview"); }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    startTransition(async () => {
      const res = await importTerminals(rows);
      setResults(res.results);
      setStep("results");
    });
  }

  function downloadResults() {
    const lines = ["Name,Status,Error", ...results.map((r) =>
      `"${r.name}","${r.success ? "imported" : "failed"}","${r.error ?? ""}"`
    )];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "terminal-import-results.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); reset(); }}
        className="flex items-center gap-1.5 h-9 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Upload size={14} />
        Import
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold">Import Terminals</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "upload" && "Upload a CSV to bulk-create terminals"}
                  {step === "preview" && `${rows.length} terminal${rows.length !== 1 ? "s" : ""} ready to import`}
                  {step === "results" && `Done — ${successCount} imported, ${failCount} failed`}
                </p>
              </div>
              <button type="button" onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {step === "upload" && (
                <>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Upload size={18} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload CSV</p>
                      <p className="text-xs text-muted-foreground mt-0.5">.csv files only</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
                  </div>
                  {parseError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{parseError}</p>}
                  <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Expected CSV format:</p>
                    <p className="font-mono">name,city,lat,lng</p>
                  </div>
                </>
              )}

              {step === "preview" && (
                <>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-border scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/60">
                        <tr>
                          {["Name", "City", "Lat", "Lng"].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30">
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2">{r.city || "—"}</td>
                            <td className="px-3 py-2 font-mono">{r.lat}</td>
                            <td className="px-3 py-2 font-mono">{r.lng}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={reset} className="h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">Change file</button>
                    <button type="button" onClick={handleImport} disabled={pending} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {pending ? "Importing…" : `Import ${rows.length}`}
                    </button>
                  </div>
                </>
              )}

              {step === "results" && (
                <>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-border scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/60">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30">
                            <td className="px-3 py-2">{r.name}</td>
                            <td className="px-3 py-2">
                              {r.success ? (
                                <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={11} /> imported</span>
                              ) : (
                                <span className="flex items-center gap-1 text-destructive" title={r.error}><AlertCircle size={11} /> failed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={downloadResults} className="flex items-center gap-1.5 h-9 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Download size={13} /> Download results
                    </button>
                    <button type="button" onClick={handleClose} className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Done</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
