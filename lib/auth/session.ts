import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/env.public";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

/** The signed-in user from the verified session token, or null. Never trusts client-supplied ids. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** Admin check against profiles.role (which customers cannot write). */
export const isAdminUser = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data as { role?: string } | null)?.role === "admin";
});

// ---- Route handlers and server actions: throw AppError ----

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please log in to continue");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!(await isAdminUser(user.id))) throw new AppError("FORBIDDEN", "You are not allowed to do this");
  return user;
}

// ---- Pages: redirect instead of throwing ----

export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
}

export async function requireUserPage(next: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}

/** Non-admins get a 404 so the admin area is not advertised. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUserPage("/admin");
  if (!(await isAdminUser(user.id))) notFound();
  return user;
}
