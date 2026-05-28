"use client";

import { useEffect, useState } from "react";
import { Car, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ActiveTripsCard({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { count: fresh } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      if (fresh !== null) setCount(fresh);
    }

    const channel = supabase
      .channel("active-trips-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">Active Trips</p>
        <div className="rounded-lg p-2 bg-primary/10">
          <Car size={17} className="text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{count.toLocaleString()}</p>
      <div className="flex items-center gap-1.5 text-xs">
        <Activity size={13} className="text-muted-foreground" />
        <span className="text-muted-foreground">live now</span>
        <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>
    </div>
  );
}
