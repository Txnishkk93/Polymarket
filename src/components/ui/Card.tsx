import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          "bg-surface border border-border rounded-xl overflow-hidden shadow-lg shadow-black/10 transition-all duration-300",
          hoverable && "hover:border-neutral-700 hover:shadow-black/20 hover:translate-y-[-2px]",
          className
        )
      )}
      {...props}
    />
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(clsx("p-5 border-b border-border/50", className))}
      {...props}
    />
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => {
  return (
    <h3
      className={twMerge(
        clsx("text-lg font-semibold text-text-primary tracking-tight", className)
      )}
      {...props}
    />
  );
};

export const CardDescription: React.FC<
  React.HTMLAttributes<HTMLParagraphElement>
> = ({ className, ...props }) => {
  return (
    <p
      className={twMerge(
        clsx("text-sm text-text-secondary mt-1", className)
      )}
      {...props}
    />
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return <div className={twMerge(clsx("p-5", className))} {...props} />;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx("p-5 bg-black/10 border-t border-border/50 flex items-center justify-between", className)
      )}
      {...props}
    />
  );
};
