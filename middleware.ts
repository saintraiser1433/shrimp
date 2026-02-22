import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is enforced in server components (layouts), not in Edge middleware,
// because the Edge runtime does not support Node.js 'crypto' (required for JWT).
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
