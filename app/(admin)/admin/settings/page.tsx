import { fetchSettings } from "@/app/(admin)/admin/_actions/settings";
import GeneralCard from "./_components/GeneralCard";
import LandingPageCard from "./_components/LandingPageCard";
import FeatureTogglesCard from "./_components/FeatureTogglesCard";
import { SecurityCard, DangerZoneCard } from "./_components/SecurityCard";

export default async function AdminSettingsPage() {
  const settings = await fetchSettings();

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform configuration and feature toggles
        </p>
      </div>

      <div className="w-3/4 space-y-5">
        <GeneralCard settings={settings} />
        <LandingPageCard settings={settings} />
        <FeatureTogglesCard settings={settings} />
        <SecurityCard settings={settings} />
        <DangerZoneCard settings={settings} />
      </div>
    </div>
  );
}
