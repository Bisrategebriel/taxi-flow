// DEV ONLY — visual verification of all four map marker types.
// Navigate to /map-markers in dev. Delete this entire (dev) folder before release.
import dynamic from "next/dynamic";

const MapMarkersDemoInner = dynamic(
  () => import("./_components/MapMarkersDemoInner"),
  { ssr: false, loading: () => <div style={{ height: "100vh", background: "#e2e8f0" }} /> }
);

export default function MapMarkersDevPage() {
  return <MapMarkersDemoInner />;
}
