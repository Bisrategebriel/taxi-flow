"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
}

export default function StartTripButton({ href }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "w-full h-12 rounded-xl bg-primary text-sm font-semibold text-primary-foreground",
        "flex items-center justify-center gap-2 transition-colors",
        "hover:bg-primary/90 disabled:opacity-80 disabled:cursor-not-allowed"
      )}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          Starting trip…
        </>
      ) : (
        <>
          Start Trip
          <ChevronRight size={18} />
        </>
      )}
    </button>
  );
}
