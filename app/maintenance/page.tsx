// FR-SS-01
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border mb-6">
        <Wrench size={28} className="text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Under Maintenance</h1>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        TaxiFlow is temporarily offline for scheduled maintenance. We&apos;ll be
        back shortly. Thank you for your patience.
      </p>
    </div>
  );
}
