import { type InputHTMLAttributes, type Ref } from "react";

type Variant = "default" | "inline";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  variant?: Variant;
  ref?: Ref<HTMLInputElement>;
}

const variantBorder: Record<Variant, string> = {
  default: "border-hairline focus:border-fg/40",
  inline:
    "border-transparent hover:bg-fg/5 hover:border-hairline focus:border-fg/40 focus:bg-transparent",
};

export function Input({
  invalid,
  variant = "default",
  className = "",
  ref,
  ...props
}: InputProps) {
  const base =
    "rounded-md border bg-transparent px-3 py-1.5 text-sm text-fg outline-none transition-colors placeholder:text-muted disabled:opacity-50 disabled:cursor-not-allowed";
  const border = invalid
    ? "border-negative focus:border-negative"
    : variantBorder[variant];
  return (
    <input
      ref={ref}
      className={`${base} ${border} ${className}`}
      {...props}
    />
  );
}
