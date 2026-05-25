export function tripDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").slice(-6);
  const num = parseInt(hex, 16) % 100000;
  return `TF-${num.toString().padStart(5, "0")}`;
}
