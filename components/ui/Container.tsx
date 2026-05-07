// NFR-US-03
import { cn } from "@/lib/utils";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const maxWidthClasses: Record<MaxWidth, string> = {
  sm:   "max-w-sm",
  md:   "max-w-2xl",
  lg:   "max-w-4xl",
  xl:   "max-w-6xl",
  "2xl":"max-w-7xl",
  full: "max-w-full",
};

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
}

export default function Container({ children, className, maxWidth = "xl" }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
