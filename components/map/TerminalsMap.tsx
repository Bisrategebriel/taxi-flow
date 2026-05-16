"use client";
// FR-NT-01
import dynamic from "next/dynamic";

const TerminalsMapInner = dynamic(
  () => import("@/components/map/TerminalsMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 rounded-2xl bg-muted animate-pulse" />
    ),
  }
);

export default TerminalsMapInner;
