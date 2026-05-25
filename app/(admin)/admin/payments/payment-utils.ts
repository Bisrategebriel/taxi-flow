export function payDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").slice(-6);
  const num = parseInt(hex, 16) % 100000;
  return `PAY-${num.toString().padStart(5, "0")}`;
}

export function formatRef(method: string, ref: string | null): string {
  if (method === "cash") return "CASH";
  if (!ref) return "—";
  if (ref.length <= 12) return ref;
  return `${ref.slice(0, 4)}...${ref.slice(-4)}`;
}
