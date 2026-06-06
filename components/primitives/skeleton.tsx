import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-r from-porcelain2 via-stone/70 to-porcelain2 bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}
