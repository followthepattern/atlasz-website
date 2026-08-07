/** Live tool activity while the agent "works" — pulsing dot + mono chip.
    Shared by the chat and capture showcases. */
export function BusyLine({ name }: { name: string }) {
  return (
    <div className="chat-in flex items-center gap-1.5 text-xs text-muted">
      <span className="inline-block size-1.5 animate-pulse rounded-full bg-fg/40" />
      <span className="rounded-md bg-fg/5 px-1.5 py-0.5 font-mono">{name}</span>
    </div>
  );
}
