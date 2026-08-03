import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Compass className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-4xl font-semibold text-foreground">404</h1>
        <p className="text-lg font-medium text-foreground">Page not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Button render={<Link href="/pos" />}>Back to POS</Button>
    </div>
  );
}
