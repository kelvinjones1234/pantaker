import { NextResponse, type NextRequest } from "next/server";
import { productionConfigError } from "@/lib/env";

/**
 * Refuses to serve a misconfigured production deployment. NextAuth JWT sessions
 * do not need middleware cookie refresh; route guards establish identity in
 * server components and actions.
 */
export function middleware(_request: NextRequest) {
  const configError = productionConfigError();
  if (configError) {
    return new NextResponse(configError, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
