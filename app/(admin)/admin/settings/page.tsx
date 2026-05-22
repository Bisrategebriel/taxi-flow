import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Settings size={28} className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">System Settings</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Platform configuration, feature flags, and super-admin controls — coming in Phase 9.
        </p>
      </div>
    </div>
  );
}
