import { Check } from "@/icons";

export function Checkbox({
  checked,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? "border-accent bg-accent text-accent-fg"
          : "border-hairline text-transparent hover:border-fg/40"
      } ${className}`}
    >
      <Check className="h-3.5 w-3.5" />
    </button>
  );
}
