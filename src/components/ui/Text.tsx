export function Text({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`text-sm text-muted ${className}`}>{children}</p>;
}
