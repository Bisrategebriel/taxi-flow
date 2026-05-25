"use client";

import RouteListPanel, { type RouteItem } from "./RouteListPanel";
import type { TerminalOption } from "./AddRouteModal";

interface Props {
  routes: RouteItem[];
  terminals: TerminalOption[];
}

export default function RoutesView({ routes, terminals }: Props) {
  return <RouteListPanel routes={routes} terminals={terminals} />;
}
