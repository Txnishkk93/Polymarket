import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, icon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-text-secondary pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={twMerge(
              clsx(
                "flex h-10 w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                icon && "pl-10",
                error && "border-red-500 focus-visible:ring-red-500",
                className
              )
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
