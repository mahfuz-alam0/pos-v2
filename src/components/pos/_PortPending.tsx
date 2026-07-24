// Shared "not yet ported" notice for POS sub-trees whose faithful migration is
// a large multi-file effort (see the migration report). Renders a clearly
// flagged panel so the page compiles and runs, and the seam is explicit.
export default function PortPending({ name, detail }) {
  return (
    <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/30 dark:text-amber-200">
      <p className="font-semibold">{name} — full port pending</p>
      {detail && <p className="mt-1 opacity-80">{detail}</p>}
    </div>
  );
}
