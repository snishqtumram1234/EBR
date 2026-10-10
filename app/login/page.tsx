import type { Metadata } from "next";
import { Suspense } from "react";
import { loginAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Log in — Aurelle" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "560px" }}>
          <span className="eyebrow fade">(01) — Log in</span>
          <h1 className="serif" style={{ margin: "18px 0 48px", fontWeight: "300", fontSize: "clamp(54px, 8vw, 104px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            <span className="rv"><span>Welcome</span></span>
            <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>back.</em></span></span>
          </h1>
          <Suspense fallback={null}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const initialError = sp.error === "confirm" ? "That confirmation link is invalid or has expired. Please try again." : undefined;
  return <AuthForm mode="login" next={next} action={loginAction} initialError={initialError} />;
}
