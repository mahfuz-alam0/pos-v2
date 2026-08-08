import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ECOM_URL = process.env.NEXT_PUBLIC_ECCOMMERCE_URL;

// Inlined at build time. Only the sidecar build (NEXT_PUBLIC_TAURI=1) proxies;
// the web build routes to the API hosts directly and never hits `/proxy/*`.
const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

// The Tauri app serves the Next sidecar over plain http://localhost, but the API
// sets its session cookie with `Secure; SameSite=None`. WKWebView (unlike Chrome)
// gives localhost no exemption and silently drops Secure cookies on http, so login
// appears to succeed and every following request is unauthenticated.
//
// A `rewrites()` entry can't help: it pipes the upstream `Set-Cookie` through
// verbatim. So proxy the request here instead and rewrite the cookie attributes on
// the way back — same-origin http cookie in, session preserved.
function stripSecure(cookie: string) {
  return cookie
    .split(";")
    .filter((part) => !/^\s*secure\s*$/i.test(part))
    .map((part) => (/^\s*samesite=/i.test(part) ? " SameSite=Lax" : part))
    .join(";");
}

export async function proxy(request: NextRequest) {
  if (!isTauri) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  const ecom = pathname.startsWith("/proxy/ecom/");
  const upstream = ecom
    ? `${ECOM_URL}${pathname.slice("/proxy/ecom".length)}${search}`
    : `${BASE_URL}${pathname.slice("/proxy".length)}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const upstreamResponse = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
    // Required by undici whenever a streamed body is passed through.
    // @ts-expect-error -- not in the DOM RequestInit type
    duplex: "half",
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });

  const cookies = upstreamResponse.headers.getSetCookie();
  if (cookies.length) {
    response.headers.delete("set-cookie");
    for (const cookie of cookies) {
      response.headers.append("set-cookie", stripSecure(cookie));
    }
  }

  return response;
}

export const config = {
  matcher: "/proxy/:path*",
};
