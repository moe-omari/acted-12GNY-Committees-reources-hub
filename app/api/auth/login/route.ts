import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };

  const expectedUsername = process.env.ADMIN_USERNAME ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json({ error: "Admin credentials not configured." }, { status: 500 });
  }

  const { username = "", password = "" } = body;

  // Timing-safe comparison to prevent enumeration attacks
  const uMatch =
    username.length === expectedUsername.length &&
    timingSafeEqual(Buffer.from(username), Buffer.from(expectedUsername));
  const pMatch =
    password.length === expectedPassword.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(expectedPassword));

  if (!uMatch || !pMatch) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  // Session token = SHA-256(username:password) — same derivation as the middleware
  const token = createHash("sha256")
    .update(`${expectedUsername}:${expectedPassword}`)
    .digest("hex");

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
