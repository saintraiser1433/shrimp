import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

/**
 * Route Handler: clears stale/mismatched auth cookies and redirects to /login.
 * Server Components cannot delete cookies — only Route Handlers and Server Actions can.
 * Admin/Farmer layouts redirect here when auth() throws a JWT decryption error.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`);
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}
