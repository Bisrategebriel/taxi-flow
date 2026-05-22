import { createTerminal } from "@/app/(admin)/admin/_actions/terminals";
import TerminalForm from "../_components/TerminalForm";

export default function NewTerminalPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Terminal</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a new bus/taxi terminal</p>
      </div>
      <TerminalForm action={createTerminal} submitLabel="Create Terminal" />
    </div>
  );
}
