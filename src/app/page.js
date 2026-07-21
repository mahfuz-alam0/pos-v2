"use client";

import { useState } from "react";

export default function Home() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error("Test error");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={() => setShouldError(true)}
        className="rounded border px-4 py-2"
      >
        Trigger error
      </button>
    </div>
  );
}
