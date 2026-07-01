import { NextRequest, NextResponse } from "next/server";

// The session cookie value is SHA-256(username:password), computed at login time
// and re-derived here using Web Crypto (available in Edge runtime).
async function expectedToken(): Promise<string> {
  const u = process.env.ADMIN_USERNAME ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!u || !p) return "";
  const data = new TextEncoder().encode(`${u}:${p}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page through
  if (pathname === "/cp-admin/login") {
    // Redirect already-authenticated users away from the login page
    const session = request.cookies.get("admin-session")?.value;
    const token = await expectedToken();
    if (token && session === token) {
      return NextResponse.redirect(new URL("/cp-admin", request.url));
    }
    return NextResponse.next();
  }

  const session = request.cookies.get("admin-session")?.value;
  const token = await expectedToken();

  if (!token || session !== token) {
    return NextResponse.redirect(new URL("/cp-admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cp-admin/:path*"],
};
