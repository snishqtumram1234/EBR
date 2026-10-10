import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Script from "next/script";
import { MotionEngine } from "@/components/site/motion-engine";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteToast } from "@/components/site/site-toast";
import { StoreProvider } from "@/components/store/store-provider";
import "./globals.css";

// Same families and weights as the design's Google Fonts link, self-hosted.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurelle — Home",
  description: "Furniture that makes your space feel like home. Sofas, beds, dining and storage, delivered free.",
};

// Runs before first paint so server-rendered content starts in its pre-reveal
// state (the design renders client-side, so it never flashes). Mirrors the
// checks in MotionEngine: motion unless reduced motion; preloader on the home page.
const MOTION_BOOT = `(function(){try{var H=document.documentElement;if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;H.classList.add('mo');if(location.pathname==='/')H.classList.add('mo-page');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body>
        <Script id="motion-boot" strategy="beforeInteractive">
          {MOTION_BOOT}
        </Script>
        <StoreProvider>
          <div className="site" id="top">
            <MotionEngine />
            <SiteHeader />
            {children}
            <SiteFooter />
            <SiteToast />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
