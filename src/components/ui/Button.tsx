import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : "border border-hairline text-fg hover:bg-fg/5";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
