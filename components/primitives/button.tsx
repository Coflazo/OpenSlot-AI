"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-[650] text-[14px] rounded-btn transition-[transform,background-color,box-shadow] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peacock/40 focus-visible:ring-offset-2 focus-visible:ring-offset-porcelain active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-peacock text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] hover:bg-peacock-600 active:bg-peacock-700",
        secondary:
          "bg-white text-ink border border-stone hover:bg-porcelain2",
        ghost: "text-ink-600 hover:bg-porcelain2",
        danger:
          "border border-sienna text-sienna-700 hover:bg-sienna-50",
        success:
          "bg-vert text-white hover:bg-vert-500 active:bg-vert-600",
        violet:
          "bg-violet text-white hover:bg-violet-600 active:bg-violet-700",
        link: "text-peacock underline-offset-2 hover:underline"
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
