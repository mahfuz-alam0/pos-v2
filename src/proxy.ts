import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ECOM_URL = process.env.NEXT_PUBLIC_ECCOMMERCE_URL;

const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

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

  const socketio = pathname.startsWith("/proxy/socket.io");
  const upstream = socketio
    ? `${BASE_URL}/socket.io${pathname.slice("/proxy/socket.io".length)}${search}`
    : ecom
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
