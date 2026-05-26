"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

interface Props {
  fromId: string;
  toId: string;
}

export default function ReverseRouteButton({ fromId, toId }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/route-search/result?from=${toId}&to=${fromId}`)}
      aria-label="Reverse route direction"
      className="absolute top-4 right-4 z-1000 inline-flex h-9 w-9 items-center justify-center
        rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50
        md:right-8"
    >
      <ArrowLeftRight size={16} />
    </button>
  );
}
