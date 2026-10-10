"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/auth/actions";

const label = { display: "block", fontSize: "12px", letterSpacing: ".16em", textTransform: "uppercase", color: "#6A5C4F" } as const;

/** Shared login / signup form in the Aurelle style. */
export function AuthForm({
  mode,
  next,
  action,
  initialError,
}: {
  mode: "login" | "signup";
  next: string;
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { error: initialError });
  const signup = mode === "signup";
  const other = signup ? "/login" : "/signup";

  if (state.notice) {
    return (
      <div style={{ textAlign: "center" }}>
        <p className="serif" style={{ fontSize: "36px", fontWeight: "300", margin: "0 0 16px", lineHeight: "1.05" }}>
          Check your <em style={{ color: "#7B4E33" }}>inbox.</em>
        </p>
        <p style={{ margin: "0", fontSize: "15px", lineHeight: "1.7", color: "#6A5C4F" }}>{state.notice}</p>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <input type="hidden" name="next" value={next} />
      {signup && (
        <label style={label}>
          Full name
          <input className="field" name="full_name" required autoComplete="name" placeholder="Priya Deshpande" style={{ marginTop: "8px" }} />
        </label>
      )}
      <label style={label}>
        Email address
        <input className="field" name="email" type="email" required autoComplete="email" placeholder="you@example.com" style={{ marginTop: "8px" }} />
      </label>
      <label style={label}>
        Password
        <input
          className="field"
          name="password"
          type="password"
          required
          minLength={signup ? 8 : 1}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "At least 8 characters" : "Your password"}
          style={{ marginTop: "8px" }}
        />
      </label>

      {state.error && (
        <p role="alert" style={{ margin: "0", padding: "12px 16px", borderRadius: "6px", background: "#F2DED3", color: "#8A2E1C", fontSize: "14px", lineHeight: "1.5" }}>
          {state.error}
        </p>
      )}

      <button className="btn" type="submit" disabled={pending} style={{ width: "100%", minHeight: "56px", opacity: pending ? ".7" : "1", cursor: pending ? "progress" : "pointer" }}>
        {pending ? (signup ? "Creating your account…" : "Signing you in…") : signup ? "Create account" : "Log in"}
      </button>

      <p style={{ margin: "0", textAlign: "center", fontSize: "14px", color: "#6A5C4F" }}>
        {signup ? "Already have an account? " : "New to Aurelle? "}
        <Link href={`${other}?next=${encodeURIComponent(next)}`} className="ulink" style={{ color: "#231E1A" }}>
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
