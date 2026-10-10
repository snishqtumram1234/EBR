"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/session";
import { publicEnv, isSupabaseConfigured } from "@/lib/env.public";
import { AppError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

const NOT_CONFIGURED = "The store's database isn't connected yet. Add the Supabase keys to .env.local and restart the server.";

const email = z.email("Enter a valid email address").max(254).transform((e) => e.toLowerCase());

const loginSchema = z.strictObject({
  email,
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().max(300).optional(),
});

const signupSchema = z.strictObject({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(200),
  next: z.string().max(300).optional(),
});

async function limit(scope: string, max: number): Promise<string | null> {
  try {
    rateLimit(`${scope}:${clientIp(await headers())}`, max, 10 * 60 * 1000);
    return null;
  } catch (err) {
    return err instanceof AppError ? err.message : "Please try again later.";
  }
}

// Next adds internal "$ACTION_*" fields to server-action forms; the schemas are strict, so drop them.
function fields(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("$ACTION")));
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const limited = await limit("login", 10);
  if (limited) return { error: limited };

  const parsed = loginSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // One message for every failure so the form cannot be used to find out which emails have accounts.
    return {
      error: error.code === "email_not_confirmed" ? "Please confirm your email first. Check your inbox." : "Incorrect email or password.",
    };
  }
  redirect(safeNext(parsed.data.next));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const limited = await limit("signup", 5);
  if (limited) return { error: limited };

  const parsed = signupSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  const next = safeNext(parsed.data.next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    return { error: error.code === "weak_password" ? "Choose a stronger password." : "We couldn't create your account. Please try again." };
  }
  if (data.session) redirect(next); // email confirmation is off: signed in straight away
  return { notice: "Almost there. We've sent a confirmation link to your email. Open it to finish creating your account." };
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
