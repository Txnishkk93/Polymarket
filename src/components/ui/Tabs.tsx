"use client";

import React, { createContext, useContext, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(defaultValue || "");
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : localValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setLocalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={twMerge(clsx("w-full", className))} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center p-1 rounded-lg bg-surface border border-border w-full",
          className
        )
      )}
      {...props}
    />
  );
};

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className,
  disabled,
  children,
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 w-full",
          isActive
            ? "bg-neutral-800 text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary hover:bg-neutral-900/50",
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const isActive = context.value === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      className={twMerge(clsx("mt-3 focus-visible:outline-none", className))}
      {...props}
    >
      {children}
    </div>
  );
};
