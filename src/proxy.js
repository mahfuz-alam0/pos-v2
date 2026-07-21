import { NextResponse } from "next/server";

// Auth is guarded client-side (see src/components/auth/AuthGuard.jsx).
// The session lives on the API server's origin, not this app's, so no
// auth cookie is ever visible here to check.
export function proxy(request) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logos).*)"],
};
