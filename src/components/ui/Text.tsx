import type { ComponentPropsWithoutRef } from "react";

export function Text({
  children,
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p className={`text-sm text-muted ${className}`} {...rest}>
      {children}
    </p>
  );
}
