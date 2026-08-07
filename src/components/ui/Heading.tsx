import type { ComponentPropsWithoutRef } from "react";

export function Heading({
  children,
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"h1">) {
  return (
    <h1 className={`text-xl font-semibold text-fg ${className}`} {...rest}>
      {children}
    </h1>
  );
}

export function Subheading({
  children,
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2 className={`text-base font-semibold text-fg ${className}`} {...rest}>
      {children}
    </h2>
  );
}
