"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MAX_LINE_QUANTITY } from "@/lib/config";

/**
 * Guest cart and wishlist, kept in localStorage (per the spec, guests keep
 * their cart in the browser). Holds only product ids and quantities; prices
 * are always looked up again on the server at checkout.
 */

export type CartLine = { productId: string; quantity: number };

type Snapshot = { cart: CartLine[]; liked: string[] };

const CART_KEY = "aurelle.cart.v1";
const LIKED_KEY = "aurelle.liked.v1";
const EMPTY: Snapshot = { cart: [], liked: [] };

let snapshot: Snapshot = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

const isCart = (v: unknown): v is CartLine[] =>
  Array.isArray(v) &&
  v.every(
    (l) =>
      l && typeof l === "object" && typeof (l as CartLine).productId === "string" && Number.isInteger((l as CartLine).quantity),
  );
const isLiked = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  snapshot = { cart: read(CART_KEY, [], isCart), liked: read(LIKED_KEY, [], isLiked) };
}

function write(next: Snapshot) {
  snapshot = next;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next.cart));
    window.localStorage.setItem(LIKED_KEY, JSON.stringify(next.liked));
  } catch {
    // Private mode or storage full: keep the in-memory copy.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY || e.key === LIKED_KEY) {
      loaded = false;
      load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return snapshot;
}

const getServerSnapshot = () => EMPTY;

type StoreApi = {
  cart: CartLine[];
  cartCount: number;
  liked: string[];
  likedCount: number;
  isLiked: (id: string) => boolean;
  add: (productId: string, name: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clearCart: () => void;
  toggleLike: (productId: string) => void;
  toast: string;
  showToast: (message: string) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((message: string) => {
    clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const api = useMemo<StoreApi>(() => {
    const cart = state.cart;
    return {
      cart,
      cartCount: cart.reduce((n, l) => n + l.quantity, 0),
      liked: state.liked,
      likedCount: state.liked.length,
      isLiked: (id) => state.liked.includes(id),
      add: (productId, name, quantity = 1) => {
        const existing = cart.find((l) => l.productId === productId);
        const next = existing
          ? cart.map((l) =>
              l.productId === productId ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l,
            )
          : [...cart, { productId, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }];
        write({ ...snapshot, cart: next });
        showToast(`${name} added to cart`);
      },
      setQuantity: (productId, quantity) => {
        const q = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.round(quantity)));
        write({ ...snapshot, cart: cart.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)) });
      },
      remove: (productId) => write({ ...snapshot, cart: cart.filter((l) => l.productId !== productId) }),
      clearCart: () => write({ ...snapshot, cart: [] }),
      toggleLike: (productId) =>
        write({
          ...snapshot,
          liked: state.liked.includes(productId)
            ? state.liked.filter((id) => id !== productId)
            : [...state.liked, productId],
        }),
      toast,
      showToast,
    };
  }, [state, toast, showToast]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
