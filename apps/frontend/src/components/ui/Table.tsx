import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={twMerge(
        clsx("w-full caption-bottom text-sm border-collapse text-left", className)
      )}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={twMerge(clsx("border-b border-border bg-neutral-900/30", className))}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={twMerge(clsx("[&_tr:last-child]:border-0", className))}
    {...props}
  />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={twMerge(
      clsx(
        "border-b border-border/50 transition-colors hover:bg-surface/50 data-[state=selected]:bg-muted",
        className
      )
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={twMerge(
      clsx(
        "h-10 px-4 align-middle font-medium text-text-secondary [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={twMerge(
      clsx(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
