import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/signin"];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get("pos-core-admin-auth")?.value;

  if (!token && !isPublic) {
    const signInUrl = new URL("/signin", request.url);
    if (pathname !== "/") signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (token && pathname.startsWith("/signin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logos).*)"],
};
