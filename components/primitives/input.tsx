import * as React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-btn border border-stone bg-white px-3 text-[14px] text-ink placeholder:text-ink-400 transition focus-visible:outline-none focus-visible:border-peacock focus-visible:ring-2 focus-visible:ring-peacock/15 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[80px] w-full rounded-btn border border-stone bg-white px-3 py-2 text-[14px] leading-[20px] text-ink placeholder:text-ink-400 focus-visible:outline-none focus-visible:border-peacock focus-visible:ring-2 focus-visible:ring-peacock/15",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-meta text-ink-500 font-[600]", className)} {...props} />
  )
);
Label.displayName = "Label";
