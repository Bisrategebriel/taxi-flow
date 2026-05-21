"use client";
import dynamic from "next/dynamic";

const DirectionsMapInner = dynamic(
  () => import("@/components/map/DirectionsMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[45vh] bg-muted animate-pulse" />
    ),
  }
);

export default DirectionsMapInner;
