"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { Stepper } from "@/components/product/stepper";

export function ProductActions({ id, name }: { id: string; name: string }) {
  const store = useStore();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const liked = store.isLiked(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <Stepper value={qty} onChange={setQty} label={name} />
        <button className="btn" style={{ flex: "1 1 180px" }} onClick={() => store.add(id, name, qty)}>
          Add to cart
        </button>
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          className="btn btn-o"
          style={{ flex: "1 1 180px" }}
          onClick={() => {
            store.add(id, name, qty);
            router.push("/checkout");
          }}
        >
          Buy now
        </button>
        <button className="ibtn" onClick={() => store.toggleLike(id)} aria-label={liked ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`} style={{ width: "50px", height: "50px", border: "1px solid #231E1A" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "#A65A35" : "none"} stroke={liked ? "#A65A35" : "#231E1A"} strokeWidth="1.6" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
        </button>
      </div>
    </div>
  );
}
