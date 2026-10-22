"use client";
import dynamic from "next/dynamic";
const Callback = dynamic(() => import("@/components/auth-callback"), {
  ssr: false,
  loading: () => <p>Preparing Tide callback…</p>,
});
export default Callback;
