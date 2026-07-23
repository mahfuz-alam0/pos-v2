export default function InitializingScreen() {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-3 bg-surface">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">Initializing Data</p>
    </div>
  );
}
