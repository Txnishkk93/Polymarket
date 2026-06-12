import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "yes" | "no" | "purple" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants = {
    primary:
      "bg-white text-background hover:bg-neutral-200 focus:ring-white",
    secondary:
      "bg-neutral-800 text-text-primary hover:bg-neutral-700 focus:ring-neutral-700",
    outline:
      "border border-border text-text-primary hover:bg-surface focus:ring-neutral-800",
    yes:
      "bg-yes text-white hover:bg-yes-hover focus:ring-yes",
    no:
      "bg-no text-white hover:bg-no-hover focus:ring-no",
    purple:
      "bg-purple text-white hover:bg-purple-hover focus:ring-purple",
    ghost:
      "text-text-secondary hover:text-text-primary hover:bg-surface focus:ring-neutral-800",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3.5 text-lg",
  };

  return (
    <button
      className={twMerge(
        clsx(baseStyles, variants[variant], sizes[size], className)
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
