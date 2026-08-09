import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

/* Exported so a link can wear the button's appearance without the button
   becoming polymorphic. A CTA that navigates should be an <a> — it belongs in
   the tab order as a link, opens in a new tab on cmd-click, and is announced as
   a link rather than as a control that does something in place. */
export function buttonClasses(variant: Variant = "secondary", className = "") {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-fg hover:opacity-90"
      : "border border-hairline text-fg hover:bg-fg/5";
  return `${base} ${styles} ${className}`;
}

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
