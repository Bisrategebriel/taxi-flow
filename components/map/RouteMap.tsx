"use client";
// FR-MP-01
import dynamic from "next/dynamic";

const RouteMapInner = dynamic(
  () => import("@/components/map/RouteMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 md:h-80 rounded-2xl bg-muted animate-pulse" />
    ),
  }
);

export default RouteMapInner;
