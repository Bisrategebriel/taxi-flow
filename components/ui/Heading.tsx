// NFR-US-03
import { cn } from "@/lib/utils";

const levelClasses: Record<number, string> = {
  1: "text-4xl font-bold leading-tight tracking-tight text-foreground",
  2: "text-3xl font-semibold leading-tight text-foreground",
  3: "text-2xl font-semibold text-foreground",
  4: "text-xl font-medium text-foreground",
  5: "text-lg font-medium text-foreground",
  6: "text-base font-medium text-foreground",
};

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

export default function Heading({ level, children, className }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag className={cn(levelClasses[level], className)}>{children}</Tag>
  );
}
