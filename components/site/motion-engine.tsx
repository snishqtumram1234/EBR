"use client";

import { useEffect } from "react";

/**
 * The design's motion system, ported line for line from Main.dc.html
 * (componentDidMount): smooth wheel scrolling, preloader counter, reveal on
 * scroll (.rv/.clip/.fade/.line), count-ups, parallax ([data-speed]),
 * scroll-driven horizontal track ([data-hx]), word fill ([data-fill]),
 * velocity skew ([data-skew]), hide-on-scroll nav and the custom cursor.
 *
 * Mounted once in the root layout. It re-scans the DOM every few frames, so
 * it keeps working across client-side navigations.
 */

const SMOOTH_SCROLL = true;
const PARALLAX = 1;
const PRELOADER = true;

type ParEl = HTMLElement & { _py?: number; _px?: number };

export function MotionEngine() {
  useEffect(() => {
    const W = window;
    const D = document;
    const H = D.documentElement;
    const S = (D.scrollingElement as HTMLElement | null) ?? H;
    const mq = (q: string) => !!(W.matchMedia && W.matchMedia(q).matches);
    const reduce = mq("(prefers-reduced-motion: reduce)");
    const fine = mq("(pointer: fine)");
    const isPage = () => S.scrollHeight > W.innerHeight * 2;

    const m = {
      alive: true,
      target: W.scrollY,
      cur: W.scrollY,
      smoothing: false,
      lastY: W.scrollY,
      vel: 0,
      skv: 0,
      mx: -200,
      my: -200,
      cx: -200,
      cy: -200,
      frame: 0,
      raf: 0,
      pend: [] as Element[],
      par: [] as ParEl[],
      hx: [] as ParEl[],
      fill: [] as HTMLElement[],
      sk: [] as HTMLElement[],
      ready: false,
      timers: [] as ReturnType<typeof setTimeout>[],
    };

    if (!reduce) H.classList.add("mo");
    const cursorEl = D.querySelector<HTMLElement>(".cursor");
    const cursorLabel = D.querySelector<HTMLElement>("[data-cursor-label]");
    const begin = () => {
      m.ready = true;
    };

    const loaderCount = D.querySelector<HTMLElement>("[data-loader-count]");
    if (loaderCount && (H.classList.contains("mo-page") || isPage()) && !reduce && PRELOADER) {
      H.classList.add("mo-page");
      const t0 = performance.now();
      const dur = 1700;
      const tick = (t: number) => {
        if (!m.alive) return;
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        loaderCount.textContent = ("00" + Math.round(e * 100)).slice(-3);
        if (p < 1) requestAnimationFrame(tick);
        else {
          m.timers.push(setTimeout(() => H.classList.add("mo-loaded"), 150));
          m.timers.push(setTimeout(begin, 650));
          m.timers.push(setTimeout(() => H.classList.add("mo-gone"), 1600));
        }
      };
      requestAnimationFrame(tick);
    } else {
      // The boot script may have shown the preloader; never leave it covering a page without one.
      H.classList.remove("mo-page");
      begin();
    }

    const countUp = (node: Element) => {
      const to = parseFloat(node.getAttribute("data-count") ?? "") || 0;
      const t1 = performance.now();
      const step = (t: number) => {
        if (!m.alive) return;
        const p = Math.min(1, (t - t1) / 1900);
        const e = 1 - Math.pow(1 - p, 4);
        node.textContent = String(Math.round(e * to));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (!SMOOTH_SCROLL || reduce || e.ctrlKey || e.defaultPrevented) return;
      if (!isPage()) return;
      const target = e.target as Element | null;
      if (target?.closest?.("[data-native-scroll]")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const max = S.scrollHeight - W.innerHeight;
      const dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? W.innerHeight : 1);
      if (!m.smoothing) m.cur = m.target = W.scrollY;
      m.target = Math.max(0, Math.min(max, m.target + dy));
      m.smoothing = true;
    };
    W.addEventListener("wheel", onWheel, { passive: false });

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a || !isPage()) return;
      const id = (a.getAttribute("href") ?? "").slice(1);
      const t = id ? D.getElementById(id) : null;
      if (id && !t) return;
      e.preventDefault();
      m.cur = W.scrollY;
      m.target = t
        ? Math.max(0, Math.min(S.scrollHeight - W.innerHeight, t.getBoundingClientRect().top + W.scrollY - 70))
        : 0;
      m.smoothing = !reduce;
      if (reduce) W.scrollTo(0, m.target);
    };
    D.addEventListener("click", onClick);

    const onMove = (e: MouseEvent) => {
      m.mx = e.clientX;
      m.my = e.clientY;
      if (m.cx < -100) {
        m.cx = m.mx;
        m.cy = m.my;
      }
      if (!fine || reduce || !isPage()) return;
      H.classList.add("cur-on");
      const t = (e.target as Element | null)?.closest?.("[data-cursor]");
      if (t) {
        H.classList.add("cur-big");
        if (cursorLabel) cursorLabel.textContent = t.getAttribute("data-cursor");
      } else H.classList.remove("cur-big");
    };
    const onLeave = () => H.classList.remove("cur-on");
    D.addEventListener("mousemove", onMove);
    D.addEventListener("mouseleave", onLeave);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    const loop = () => {
      if (!m.alive) return;
      m.frame++;
      const vh = W.innerHeight;
      const pg = isPage();
      const motion = pg && !reduce;
      const k = PARALLAX;
      H.classList.toggle("mo-motion", motion);

      if (m.smoothing) {
        m.cur += (m.target - m.cur) * 0.085;
        if (Math.abs(m.target - m.cur) < 0.4) {
          m.cur = m.target;
          m.smoothing = false;
        }
        W.scrollTo(0, m.cur);
      } else {
        m.cur = m.target = W.scrollY;
      }

      const y = W.scrollY;
      m.vel += (y - m.lastY - m.vel) * 0.2;
      m.lastY = y;
      H.classList.toggle("scrolled", y > 40);
      if (pg) {
        if (m.vel > 1.2 && y > 320) H.classList.add("nav-hide");
        else if (m.vel < -1.2 || y < 320) H.classList.remove("nav-hide");
      } else H.classList.remove("nav-hide");

      if (m.frame % 12 === 1) {
        m.pend = Array.from(
          D.querySelectorAll(".rv:not(.in),.clip:not(.in),.fade:not(.in),.line:not(.in),[data-count]:not(.in)"),
        );
      }
      if (m.frame % 30 === 1) {
        m.par = Array.from(D.querySelectorAll<ParEl>("[data-speed]"));
        m.hx = Array.from(D.querySelectorAll<ParEl>("[data-hx]"));
        m.fill = Array.from(D.querySelectorAll<HTMLElement>("[data-fill]"));
        m.sk = Array.from(D.querySelectorAll<HTMLElement>("[data-skew]"));
      }
      if (m.ready) {
        for (const n of m.pend) {
          if (n.classList.contains("in")) continue;
          const r = n.getBoundingClientRect();
          if (r.top < vh * 0.9 && r.bottom > -40) {
            n.classList.add("in");
            if (n.hasAttribute("data-count") && H.classList.contains("mo")) countUp(n);
          }
        }
      }

      for (const pe of m.par) {
        if (!pe.parentElement) continue;
        const box = pe.parentElement.getBoundingClientRect();
        const sp = (parseFloat(pe.getAttribute("data-speed") ?? "") || 0) * k;
        const tg = motion ? (box.top + box.height / 2 - vh / 2) * sp : 0;
        const c = pe._py == null ? tg : pe._py + (tg - pe._py) * 0.12;
        pe._py = c;
        pe.style.transform = "translate3d(0," + c.toFixed(2) + "px,0)";
      }

      for (const tr of m.hx) {
        const wrap = tr.parentElement;
        if (!wrap) continue;
        const rb = wrap.getBoundingClientRect();
        const max = Math.max(0, tr.scrollWidth - wrap.clientWidth + 112);
        const pr = clamp((vh - rb.top) / (vh + rb.height), 0, 1);
        const tx = motion ? -pr * max : 0;
        const cx = tr._px == null ? tx : tr._px + (tx - tr._px) * 0.1;
        tr._px = cx;
        tr.style.transform = "translate3d(" + cx.toFixed(2) + "px,0,0)";
      }

      for (const fb of m.fill) {
        const fr = fb.getBoundingClientRect();
        const ws = fb.querySelectorAll<HTMLElement>(".w");
        const fp = motion ? clamp((vh * 0.85 - fr.top) / (fr.height + vh * 0.3), 0, 1) : 1;
        ws.forEach((w, wi) => {
          const o = clamp(fp * ws.length - wi, 0, 1);
          w.style.opacity = (0.16 + o * 0.84).toFixed(3);
        });
      }

      const skT = motion ? clamp(m.vel * 0.3, -9, 9) : 0;
      m.skv += (skT - m.skv) * 0.1;
      for (const s of m.sk) s.style.transform = "skewX(" + (-m.skv).toFixed(2) + "deg)";

      if (cursorEl && motion && fine) {
        m.cx += (m.mx - m.cx) * 0.2;
        m.cy += (m.my - m.cy) * 0.2;
        cursorEl.style.transform = "translate3d(" + m.cx.toFixed(1) + "px," + m.cy.toFixed(1) + "px,0)";
      }
      m.raf = requestAnimationFrame(loop);
    };
    m.raf = requestAnimationFrame(loop);

    return () => {
      m.alive = false;
      cancelAnimationFrame(m.raf);
      m.timers.forEach(clearTimeout);
      W.removeEventListener("wheel", onWheel);
      D.removeEventListener("click", onClick);
      D.removeEventListener("mousemove", onMove);
      D.removeEventListener("mouseleave", onLeave);
      H.classList.remove("mo", "mo-page", "mo-loaded", "mo-gone", "mo-motion", "scrolled", "nav-hide", "cur-on", "cur-big");
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <span data-cursor-label="1">View</span>
    </div>
  );
}
