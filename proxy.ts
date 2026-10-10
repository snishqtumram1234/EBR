import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and sends visitors
 * who are not signed in away from account pages. Admin-only access is
 * enforced again in the admin layout (role comes from the database), and
 * every server action and route handler checks the session itself.
 */
const PROTECTED = ["/checkout", "/orders", "/account", "/admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = rawUrl ? new URL(rawUrl).origin : undefined; // tolerate a pasted "/rest/v1/" suffix
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response; // Supabase not configured yet

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|api/webhooks/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
