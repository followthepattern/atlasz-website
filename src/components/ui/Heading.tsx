export function Heading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h1 className={`text-xl font-semibold text-fg ${className}`}>{children}</h1>;
}

export function Subheading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={`text-base font-semibold text-fg ${className}`}>{children}</h2>;
}
