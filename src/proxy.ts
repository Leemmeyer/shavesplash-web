import { NextRequest, NextResponse } from "next/server";

// Set to false to open the site to the public
const PREVIEW_MODE = true;

const PREVIEW_PASSWORD = process.env.PREVIEW_PASSWORD ?? "shavesplash2026";
const COOKIE_NAME = "ss_preview";

export function proxy(req: NextRequest) {
  if (!PREVIEW_MODE) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always allow the unlock endpoint, static assets, and public images
  if (
    pathname === "/api/preview-unlock" ||
    pathname.startsWith("/_next") ||
    /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check for valid preview cookie
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === PREVIEW_PASSWORD) {
    return NextResponse.next();
  }

  // Redirect to password page (but don't redirect if already there)
  if (pathname === "/preview") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/preview";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
