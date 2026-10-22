"use client";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Fingerprint,
  GitPullRequest,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Brand, SignIn } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "./providers";
export default function Home() {
  const auth = useAuth();
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <Link href="/demo">Protection simulation</Link>
          <Link href="/dashboard">Live workspace</Link>
          <Link href="/governance">How it works</Link>
          <a
            href="https://github.com/ndhau1706/HCMUS_SGS_Fourdogs_C2"
            target="_blank"
            rel="noreferrer"
          >
            Source <ArrowUpRight size={13} />
          </a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> TIDE UNLOCKED · CHALLENGE 02
            </span>
            <h1>
              Power to operate.
              <br />
              <span>
                No power to
                <br />
                override.
              </span>
            </h1>
            <p className="hero-description">
              Let your team manage infrastructure without handing any one realm
              administrator the authority to grant privileged access alone.
            </p>
            <div className="hero-actions">
              {auth.authenticated ? (
                <Button asChild>
                  <Link href="/dashboard">
                    Open workspace <ArrowRight size={17} />
                  </Link>
                </Button>
              ) : (
                <SignIn />
              )}
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Explore workspace <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
            {!auth.configured && !auth.loading && (
              <p className="setup-hint">
                Local Tide setup pending. Workspace navigation is available;
                authentication requires enrollment.
              </p>
            )}
            <div className="hero-proof">
              <span>
                <ShieldCheck size={16} />
                Quorum-governed privileges
              </span>
              <span>
                <LockKeyhole size={16} />
                Verified at the API
              </span>
            </div>
          </div>
          <div
            className="governance-visual"
            aria-label="Privilege governance architecture"
          >
            <div className="visual-top">
              <span className="live-dot" />
              <span>THE AUTHORITY BOUNDARY</span>
              <span className="chip">ARCHITECTURE</span>
            </div>
            <div className="admin-nodes">
              {["A", "B", "C"].map((n) => (
                <div className="admin-node" key={n}>
                  <div>
                    <Users size={22} />
                  </div>
                  <span>Admin {n}</span>
                  <small>Independent identity</small>
                </div>
              ))}
            </div>
            <div className="connecting-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="quorum-node">
              <span className="quorum-icon">
                <Network size={26} />
              </span>
              <div>
                <strong>TideCloak QEA</strong>
                <small>2 of 3 · intended demo quorum</small>
              </div>
              <LockKeyhole size={19} />
            </div>
            <div className="flow-arrow">
              <ArrowDown size={18} />
            </div>
            <div className="token-node">
              <Fingerprint size={20} />
              <span>Fresh Tide-issued access token</span>
              <Check size={15} />
            </div>
            <div className="flow-arrow">
              <ArrowDown size={18} />
            </div>
            <div className="infrastructure-node">
              <Server size={19} />
              <div>
                <strong>Infrastructure API</strong>
                <small>Signature + audience + DPoP + role</small>
              </div>
              <span className="chip cyan">ENFORCE</span>
            </div>
            <p className="visual-caption">
              Illustrated policy. Verify the effective quorum in Tide Console.
            </p>
          </div>
        </section>
        <section className="landing-lower">
          <div className="section-heading">
            <span className="eyebrow">OPERATIONS, WITH SHARED AUTHORITY</span>
            <h2>A better way to share the controls.</h2>
            <p>For platform teams and organizations operating together.</p>
          </div>
          <div className="feature-grid">
            <article>
              <span>01</span>
              <LockKeyhole />
              <h3>Close the trust bottleneck</h3>
              <p>
                Conventional IAM lets an administrator rewrite who has power.
                Sensitive access needs stronger governance.
              </p>
            </article>
            <article>
              <span>02</span>
              <GitPullRequest />
              <h3>Govern the role grant</h3>
              <p>
                Real administrators approve through Tide’s enclave. CloudGuard
                cannot manufacture their approvals.
              </p>
            </article>
            <article>
              <span>03</span>
              <Server />
              <h3>Operate with verified access</h3>
              <p>
                The backend accepts a fresh, verified infra-operator token
                before changing synthetic infrastructure.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>CloudGuard — Zero-Trust Infrastructure Governance</span>
        <span>Synthetic infrastructure · TideCloak identity</span>
      </footer>
    </div>
  );
}
