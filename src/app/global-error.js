"use client";

import "./globals.css";

export default function GlobalError({ error, unstable_retry }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-4xl font-bold">Something went wrong</h1>
          <p>{error?.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => unstable_retry()}
            className="rounded border px-4 py-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
