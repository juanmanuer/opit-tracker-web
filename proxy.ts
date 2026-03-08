import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/lib/auth"

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)
  const isLoginPage = request.nextUrl.pathname === "/login"

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}