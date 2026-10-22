"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Fingerprint,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { Button } from "./ui/button";
import { useState } from "react";
const items = [
  { href: "/dashboard", label: "Infrastructure", icon: LayoutDashboard },
  { href: "/governance", label: "Access governance", icon: Users },
  { href: "/activity", label: "Activity logs", icon: Activity },
];
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon">
        <ShieldCheck size={24} />
      </span>
      <span>
        CloudGuard<span className="brand-sub">ZERO-TRUST GOVERNANCE</span>
      </span>
    </Link>
  );
}
export function SignIn({
  label = "Sign in with TideCloak",
}: {
  label?: string;
}) {
  const auth = useAuth();
  const [error, setError] = useState("");
  async function run() {
    try {
      setError("");
      await auth.login();
    } catch {
      setError(
        "Unable to start Tide sign-in. Check the identity service and browser permissions.",
      );
    }
  }
  return (
    <div>
      <Button onClick={run} disabled={auth.loading || !auth.configured}>
        <Fingerprint size={16} />
        {auth.loading ? "Connecting…" : label}
        <ArrowUpRight size={15} />
      </Button>
      {(error || auth.error) && (
        <p className="error-text" role="alert">
          {error || "Tide initialization failed. See docs/SETUP.md and retry."}
        </p>
      )}
    </div>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const [error, setError] = useState("");
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-avatar">C</span>
          <span>
            CloudGuard workspace<small>Hackathon environment</small>
          </span>
          <ChevronRight size={14} />
        </div>
        <p className="nav-heading">WORKSPACE</p>
        <nav aria-label="Workspace navigation">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? "active" : ""}`}
            >
              <Icon size={18} />
              {label}
              {pathname === href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="boundary-card">
            <LockKeyhole size={19} />
            <strong>Authority by agreement.</strong>
            <p>Privilege changes belong to real Tide governance.</p>
            <Link href="/governance">
              Understand the boundary <ArrowUpRight size={13} />
            </Link>
          </div>
          <a
            className="nav-item"
            href="https://docs.tide.org/Admin/SetupIGA"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={17} />
            Tide documentation
            <ArrowUpRight size={13} />
          </a>
          <div className="sidebar-footer">
            <span className="live-dot" /> Synthetic environment{" "}
            <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>
              {items.find((i) => i.href === pathname)?.label || "CloudGuard"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="chip muted">
              <Terminal size={13} /> LOCAL PROTOTYPE
            </span>
            {auth.authenticated ? (
              <Button
                variant="ghost"
                onClick={() =>
                  auth
                    .logout()
                    .catch(() =>
                      setError("Sign-out failed. Retry in Tide Console."),
                    )
                }
              >
                <LogOut size={15} />
                Sign out
              </Button>
            ) : (
              <SignIn label="Connect identity" />
            )}
          </div>
        </header>
        <main className="main-content">
          {!auth.configured && !auth.loading && (
            <div className="notice">
              <LockKeyhole size={17} />
              <span>
                <strong>Identity setup required.</strong> The app is ready for a
                genuine Tide adapter. Complete enrollment, then run the export
                command in docs/SETUP.md. Protected APIs fail closed.
              </span>
            </div>
          )}
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          {children}
        </main>
        <footer className="main-footer">
          <span>
            <ShieldCheck size={13} /> CloudGuard · TideCloak integration
          </span>
          <span>
            Simulated infrastructure. Real authorization when configured.
          </span>
        </footer>
      </div>
    </div>
  );
}
export function AuthRequired() {
  return (
    <div className="auth-required">
      <span className="large-icon">
        <Fingerprint size={28} />
      </span>
      <h2>Connect your identity</h2>
      <p>
        Use a real Tide account to retrieve infrastructure, verified roles, and
        application activity.
      </p>
      <SignIn />
      <Link className="text-link" href="/governance">
        How governed access works <ChevronRight size={14} />
      </Link>
    </div>
  );
}
