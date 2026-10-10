import type { Metadata } from "next";
import { Suspense } from "react";
import { signupAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account — Aurelle" };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <main>
      <section style={{ padding: "150px 0 140px" }}>
        <div className="wrap" style={{ maxWidth: "560px" }}>
          <span className="eyebrow fade">(01) — Create account</span>
          <h1 className="serif" style={{ margin: "18px 0 48px", fontWeight: "300", fontSize: "clamp(54px, 8vw, 104px)", lineHeight: ".92", letterSpacing: "-.02em" }}>
            <span className="rv"><span>Join</span></span>
            <span className="rv d1"><span><em style={{ color: "#7B4E33" }}>Aurelle.</em></span></span>
          </h1>
          <Suspense fallback={null}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  return <AuthForm mode="signup" next={next} action={signupAction} />;
}
