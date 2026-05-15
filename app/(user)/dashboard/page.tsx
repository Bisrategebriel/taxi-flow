// FR-UD-03, FR-UD-04, FR-UD-05
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, MessageCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Heading from "@/components/ui/Heading";
import { Card, CardContent } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

const QUICK_ACTIONS: {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    label: "Route Search",
    href: "/route-search",
    icon: Search,
    description: "Find routes and fares",
  },
  {
    label: "Terminals",
    href: "/terminals",
    icon: MapPin,
    description: "Nearest taxi terminal",
  },
  {
    label: "AI Chat",
    href: "/chat",
    icon: MessageCircle,
    description: "Ask our AI assistant",
  },
  {
    label: "My Trips",
    href: "/trip",
    icon: Clock,
    description: "View your trip history",
  },
];

export default async function UserDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const hour = new Date().getHours();
  const timeOfDay =
    hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div>
      <div className="border-b border-border px-4 sm:px-6 py-4">
        <Heading level={1} className="text-xl sm:text-2xl">
          Good {timeOfDay}, {profile?.full_name ?? "there"}
        </Heading>
        <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 sm:px-6 py-6">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <Icon size={32} strokeWidth={1.5} className="text-primary" />
                  <Heading level={3} className="text-sm font-semibold mt-3">
                    {action.label}
                  </Heading>
                  <p className="text-muted-foreground text-xs mt-1">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <section className="px-4 sm:px-6 pb-8">
        <Heading level={2} className="text-base font-semibold mb-4">
          Recent Activity
        </Heading>
        <p className="text-muted-foreground text-sm">
          Your trips and activity will appear here.
        </p>
      </section>
    </div>
  );
}
