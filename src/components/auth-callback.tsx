"use client";
import { useAuthCallback } from "@tidecloak/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
export default function Callback() {
  const auth = useAuth();
  const { error } = useAuthCallback({
    autoProcess: auth.configured && !auth.loading && !auth.authenticated,
    onSuccess: (returnUrl) => {
      // SDK return destinations must remain on this application's origin.
      const target = new URL(returnUrl || "/dashboard", window.location.origin);
      window.location.assign(
        target.origin === window.location.origin
          ? target.href
          : new URL("/dashboard", window.location.origin).href,
      );
    },
    onMissingVerifierRedirectTo: "/",
  });
  // The official provider completes frontchannel code exchange during init. Wait for it;
  // processing before the asynchronously loaded adapter would race IAMService configuration.
  useEffect(() => {
    if (auth.loading) return;
    if (auth.authenticated) {
      const saved = sessionStorage.getItem("kc_return_url");
      let target = new URL("/dashboard", window.location.origin);
      try {
        const candidate = new URL(
          saved || "/dashboard",
          window.location.origin,
        );
        if (
          candidate.origin === window.location.origin &&
          candidate.pathname !== "/auth/redirect"
        )
          target = candidate;
      } catch {}
      sessionStorage.removeItem("kc_return_url");
      window.location.replace(target.href);
    } else {
      const p = new URLSearchParams(window.location.search);
      if (!p.has("code") && !p.has("error"))
        window.location.replace(new URL("/", window.location.origin).href);
    }
  }, [auth.loading, auth.authenticated]);
  const failed = error || auth.error || (!auth.loading && !auth.authenticated);
  return (
    <main
      className="auth-required"
      style={{ margin: "10vh auto", maxWidth: 550 }}
    >
      <h1>
        {failed
          ? "Authentication could not complete"
          : "Completing Tide sign-in…"}
      </h1>
      <p>
        {failed
          ? "The identity service could not complete this session. Return home and retry sign-in."
          : "Exchanging the authorization code through the official Tide SDK."}
      </p>
      {failed && (
        <Link className="button button-outline" href="/">
          Return home
        </Link>
      )}
    </main>
  );
}
