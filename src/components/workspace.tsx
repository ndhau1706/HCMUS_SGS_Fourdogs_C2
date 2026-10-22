"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Download,
  Filter,
  HardDrive,
  LockKeyhole,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { AuthRequired, Shell } from "./shell";
import { Button } from "./ui/button";
import type { Resource, Activity } from "@/lib/store";
type Session = {
  subject: string;
  username: string;
  roles: string[];
  operator: boolean;
  expiresAt: number;
  issuer: string;
  consoleUrl: string;
  quorum: { verified: boolean; explanation: string };
};
function useWorkspace() {
  const auth = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [events, setEvents] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { secureFetch } = auth;
  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const r = await secureFetch(
        new URL(path, window.location.origin).href,
        init,
      );
      const body = await r.json();
      if (!r.ok)
        throw new Error(`HTTP ${r.status} · ${body.error || "Request failed"}`);
      return body;
    },
    [secureFetch],
  );
  const load = useCallback(async () => {
    if (!auth.authenticated) return;
    setLoading(true);
    try {
      const [s, r, a] = await Promise.all([
        api("/api/session"),
        api("/api/resources"),
        api("/api/activity"),
      ]);
      setSession(s);
      setResources(r.resources);
      setEvents(a.events);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Cannot retrieve verified data.",
      );
    } finally {
      setLoading(false);
    }
  }, [auth.authenticated, api]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  return {
    auth,
    session,
    resources,
    events,
    error,
    setError,
    loading,
    load,
    api,
  };
}
function Title({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return message ? (
    <div className="toast" role="status">
      <ActivityIcon size={18} />
      <span>{message}</span>
      <button aria-label="Dismiss notification" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  ) : null;
}
function uptime(startedAt: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  return seconds >= 86400
    ? `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
function ResourceCard({
  resource,
  onRestart,
  onHealth,
  busy,
}: {
  resource: Resource;
  onRestart: () => void;
  onHealth: () => void;
  busy: boolean;
}) {
  const Icon = resource.id.startsWith("db")
    ? Database
    : resource.id.startsWith("backup")
      ? HardDrive
      : Server;
  return (
    <article className="resource-card">
      <div className="resource-top">
        <span className="resource-icon">
          <Icon size={23} />
        </span>
        <span className="status">
          <span className="live-dot" />
          Running
        </span>
      </div>
      <h3>{resource.id}</h3>
      <div className="resource-meta">
        <span>{resource.environment}</span>
        <span>{resource.service}</span>
      </div>
      <div
        className="resource-chart"
        aria-label="Synthetic telemetry illustration"
      >
        <svg
          viewBox="0 0 280 52"
          preserveAspectRatio="none"
          role="img"
          aria-label="Illustrative telemetry trace"
        >
          <path
            d="M0 40 L15 36 L30 42 L45 32 L60 34 L75 24 L90 30 L105 25 L120 28 L135 15 L150 22 L165 17 L180 24 L195 12 L210 18 L225 13 L240 16 L255 7 L280 12 L280 52 L0 52 Z"
            fill="url(#area)"
          />
          <path
            d="M0 40 L15 36 L30 42 L45 32 L60 34 L75 24 L90 30 L105 25 L120 28 L135 15 L150 22 L165 17 L180 24 L195 12 L210 18 L225 13 L240 16 L255 7 L280 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="currentColor" stopOpacity=".13" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <span>Illustrative trace · synthetic metrics</span>
      </div>
      <div className="metrics">
        <div>
          <span>
            <Cpu size={13} />
            CPU
          </span>
          <strong>
            {resource.cpu}
            <small>%</small>
          </strong>
          <div className="meter">
            <i style={{ width: `${resource.cpu}%` }} />
          </div>
        </div>
        <div>
          <span>
            <HardDrive size={13} />
            Memory
          </span>
          <strong>
            {resource.memory}
            <small>%</small>
          </strong>
          <div className="meter purple">
            <i style={{ width: `${resource.memory}%` }} />
          </div>
        </div>
      </div>
      <div className="resource-uptime">
        <span>
          <Clock3 size={13} />
          Uptime
        </span>
        <strong>{uptime(resource.startedAt)}</strong>
      </div>
      <div className="recent-resource">
        <span className="tiny-dot" />
        {resource.lastActivity}
      </div>
      <div className="resource-actions">
        <Button variant="outline" onClick={onHealth}>
          <ActivityIcon size={14} />
          Health & details
        </Button>
        <Button variant="ghost" onClick={onRestart} disabled={busy}>
          <RefreshCw size={14} className={busy ? "spin" : ""} />
          Restart
        </Button>
      </div>
    </article>
  );
}
export function Dashboard() {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [detail, setDetail] = useState<{
    resource: Resource;
    checks: string[];
  } | null>(null);
  async function restart(r: Resource) {
    setBusy(r.id);
    try {
      const result = await w.api(`/api/resources/${r.id}/restart`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      setToast(result.message);
      await w.load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Restart failed.");
      await w.load();
    } finally {
      setBusy("");
    }
  }
  async function health(r: Resource) {
    try {
      setDetail(await w.api(`/api/resources/${r.id}/health`));
    } catch (e) {
      setToast(String(e));
    }
  }
  return (
    <Shell>
      <Title
        eyebrow="INFRASTRUCTURE OVERVIEW"
        title="Your infrastructure. Shared authority."
        description="Monitor your fleet. Govern who gets the power to operate it."
      >
        <Button
          variant="outline"
          onClick={w.load}
          disabled={!w.auth.authenticated || w.loading}
        >
          <RefreshCw size={15} className={w.loading ? "spin" : ""} />
          Refresh
        </Button>
      </Title>
      <div className="stat-grid">
        <div className="stat-card">
          <span>
            Infrastructure resources <Server size={16} />
          </span>
          <strong>
            {w.auth.authenticated ? w.resources.length : "—"}
            <small>synthetic fleet</small>
          </strong>
          <p>Web · Database · Recovery</p>
        </div>
        <div className="stat-card">
          <span>
            Your operating access <LockKeyhole size={16} />
          </span>
          <strong className="stat-word">
            {w.session
              ? w.session.operator
                ? "Granted"
                : "Viewer"
              : "Unverified"}
          </strong>
          <p>
            {w.session
              ? "From a server-verified realm claim"
              : "Connect Tide identity to verify"}
          </p>
        </div>
        <div className="stat-card">
          <span>
            Privilege governance <Users size={16} />
          </span>
          <strong className="stat-word">
            Tide QEA <span className="chip cyan">EXTERNAL</span>
          </strong>
          <p>Live quorum is verified in Tide Console</p>
        </div>
      </div>
      <div className="policy-strip">
        <span className="policy-icon">
          <ShieldCheck size={22} />
        </span>
        <div>
          <strong>
            {w.session?.operator
              ? "Your token permits synthetic operations."
              : "Elevated access requires governed approval."}
          </strong>
          <p>
            {w.session?.operator
              ? "Every restart still verifies signature, audience, DPoP proof and infra-operator."
              : "A single realm administrator should not be able to grant themselves the controls."}
          </p>
        </div>
        <Link href="/governance">
          View access policy <ArrowRight size={16} />
        </Link>
      </div>
      <div className="fleet-heading">
        <h2>
          Infrastructure fleet <span className="count-badge">03</span>
        </h2>
        <div className="fleet-tools">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Search resources"
              placeholder="Search resources…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="chip muted">
            <Filter size={13} />
            Synthetic only
          </span>
        </div>
      </div>
      {w.error && (
        <div role="alert" className="notice error">
          {w.error}
        </div>
      )}
      {w.auth.authenticated ? (
        <>
          <div className="resource-grid">
            {w.resources
              .filter((r) =>
                `${r.id} ${r.service} ${r.environment}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  busy={busy === r.id}
                  onRestart={() => restart(r)}
                  onHealth={() => health(r)}
                />
              ))}
          </div>
          {!w.loading &&
            !w.resources.filter((r) =>
              `${r.id} ${r.service} ${r.environment}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ).length && (
              <p className="empty">
                No resources found. Adjust your search or refresh verified data.
              </p>
            )}
          <div className="bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Recent operations</h2>
                <Link href="/activity">
                  View all <ArrowUpRight size={14} />
                </Link>
              </div>
              <EventTable events={w.events.slice(0, 4)} />
            </section>
            <section className="panel boundary-note">
              <span className="eyebrow">THE SECURITY BOUNDARY</span>
              <h3>
                Govern access.
                <br />
                Then verify authority.
              </h3>
              <p>
                Tide governs the privilege assignment. CloudGuard verifies the
                resulting token. Server operations are simulations.
              </p>
              <Link className="text-link" href="/governance">
                Explore governance <ChevronRight size={14} />
              </Link>
            </section>
          </div>
        </>
      ) : (
        <AuthRequired />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDetail(null);
                return;
              }
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2 id="health-title">{detail.resource.id}</h2>
              <button
                autoFocus
                aria-label="Close details"
                onClick={() => setDetail(null)}
              >
                <X />
              </button>
            </div>
            <span className="chip cyan">SYNTHETIC SERVICE HEALTH</span>
            <p>
              {detail.resource.service} · {detail.resource.environment}
            </p>
            {detail.checks.map((c) => (
              <p className="health-check" key={c}>
                <CheckCircle2 size={17} />
                {c}
              </p>
            ))}
            <p>
              Uptime: {uptime(detail.resource.startedAt)} · Restarts:{" "}
              {detail.resource.restarts}
            </p>
            <p className="muted-text">
              These checks describe fictional infrastructure. No host was
              contacted.
            </p>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close details
            </Button>
          </section>
        </div>
      )}
    </Shell>
  );
}
function EventTable({ events }: { events: Activity[] }) {
  return !events.length ? (
    <div className="empty">
      <ActivityIcon size={24} />
      <p>No operations recorded in this process yet.</p>
      <small>Denied calls and synthetic restarts will appear here.</small>
    </div>
  ) : (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Operation / resource</th>
            <th>Actor</th>
            <th>Time</th>
            <th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>
                <strong>{e.action}</strong>
                <small>{e.resource}</small>
              </td>
              <td>
                <code title={e.actor}>
                  {e.actor.slice(0, 14)}
                  {e.actor.length > 14 ? "…" : ""}
                </code>
              </td>
              <td>
                {new Date(e.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </td>
              <td>
                <span
                  className={`chip ${e.outcome === "denied" ? "amber" : "cyan"}`}
                >
                  {e.status} · {e.outcome}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Governance() {
  const w = useWorkspace();
  return (
    <Shell>
      <Title
        eyebrow="ACCESS GOVERNANCE"
        title="Authority needs more than one voice."
        description="Your verified privileges, and the genuine process that governs them."
      />
      <div className="governance-grid">
        <section className="panel identity-panel">
          <div className="panel-heading">
            <h2>
              <ShieldCheck size={18} />
              Verified identity
            </h2>
            <span className={`chip ${w.session ? "cyan" : "muted"}`}>
              {w.session ? "API VERIFIED" : "NOT VERIFIED"}
            </span>
          </div>
          {w.session ? (
            <>
              <span className="identity-avatar">
                {w.session.username.slice(0, 2).toUpperCase()}
              </span>
              <h3>{w.session.username}</h3>
              <p className="mono break">{w.session.subject}</p>
              <dl>
                <dt>Issuer</dt>
                <dd className="break">{w.session.issuer}</dd>
                <dt>Access token expires</dt>
                <dd>{new Date(w.session.expiresAt * 1000).toLocaleString()}</dd>
                <dt>Realm roles</dt>
                <dd className="role-list">
                  {w.session.roles.map((r) => (
                    <span className="chip" key={r}>
                      {r}
                    </span>
                  ))}
                </dd>
              </dl>
              <div
                className={`access-result ${w.session.operator ? "granted" : ""}`}
              >
                <LockKeyhole size={19} />
                <div>
                  <strong>
                    infra-operator ·{" "}
                    {w.session.operator ? "granted" : "not granted"}
                  </strong>
                  <p>
                    {w.session.operator
                      ? "Protected synthetic restarts are permitted."
                      : "A valid viewer token receives HTTP 403 for restart."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await w.auth.logout();
                  } catch {
                    w.setError("Sign out failed. Please retry.");
                  }
                }}
              >
                <RefreshCw size={15} />
                Sign out to obtain fresh claims
              </Button>
            </>
          ) : (
            <AuthRequired />
          )}
          {w.error && (
            <p className="error-text" role="alert">
              {w.error}
            </p>
          )}
        </section>
        <section className="panel governance-explainer">
          <span className="eyebrow">QUORUM ENFORCED AUTHORIZATION</span>
          <h2>
            A role grant is a<br />
            governed decision.
          </h2>
          <p>
            CloudGuard never counts approvals or assigns roles. TideCloak
            captures sensitive changes, and independent administrators authorize
            them through the Tide enclave.
          </p>
          <div className="quorum-display">
            <span>
              2<span>approvals</span>
            </span>
            <i>/</i>
            <span>
              3<span>administrators</span>
            </span>
            <div>
              <strong>Intended demo policy</strong>
              <small>
                Effective quorum has not been read by this app. Verify it in the
                real console.
              </small>
            </div>
          </div>
          <a
            className="button button-primary"
            href={
              w.session?.consoleUrl ||
              "http://localhost:8080/realms/cloudguard/tide-console/"
            }
            target="_blank"
            rel="noreferrer"
          >
            Open real Tide Console <ArrowUpRight size={16} />
          </a>
          <p className="fine-print">
            Requires your own enrolled Tide administrator identity. An app
            sign-in does not confer realm administration.
          </p>
        </section>
      </div>
      <section className="panel workflow-panel">
        <div className="panel-heading">
          <h2>The governed access workflow</h2>
          <span className="chip muted">NO APPLICATION APPROVAL COUNTERS</span>
        </div>
        <ol className="workflow">
          {[
            {
              title: "Request the role",
              text: "Ask a realm administrator to propose infra-operator for your employee identity in People → Role mappings.",
            },
            {
              title: "Review independently",
              text: "Admin A authorizes in QEA Approvals. With 3 admins and a verified threshold of 2, the grant must remain pending.",
            },
            {
              title: "Reach the real quorum",
              text: "Admin B reviews and authorizes independently. Tide applies the role assignment when the genuine threshold is met.",
            },
            {
              title: "Return with fresh claims",
              text: "Sign out and sign in again. CloudGuard verifies the new token and permits the synthetic restart.",
            },
          ].map((s, i) => (
            <li key={s.title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="notice">
        <LockKeyhole size={18} />
        <span>
          <strong>Scope matters.</strong> The master realm is outside QEA
          governance. CloudGuard does not protect against an attacker who can
          replace the application or its trusted configuration. Role revocation
          takes effect when the current access token expires; sign in again for
          updated claims.
        </span>
      </div>
    </Shell>
  );
}
export function ActivityPage() {
  const w = useWorkspace();
  const [filter, setFilter] = useState("all");
  function download() {
    const blob = new Blob([JSON.stringify(w.events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cloudguard-application-activity.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Shell>
      <Title
        eyebrow="APPLICATION ACTIVITY"
        title="Every operation leaves a trace."
        description="Shared workspace activity from this application process. Tide’s QEA evidence lives in Tide Console."
      >
        <div className="heading-actions">
          <Button
            variant="outline"
            onClick={w.load}
            disabled={!w.auth.authenticated || w.loading}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={download}
            disabled={!w.events.length}
          >
            <Download size={15} />
            Export JSON
          </Button>
        </div>
      </Title>
      <div className="notice">
        <ActivityIcon size={17} />
        <span>
          Application logs contain no access tokens. The latest 300 events are
          shown; local JSONL files rotate at 2 MB. These records are{" "}
          <strong>not cryptographic QEA audit proofs</strong>.
        </span>
      </div>
      {w.error && (
        <div role="alert" className="notice error">
          {w.error}
        </div>
      )}
      {w.auth.authenticated ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Operation journal</h2>
            <label className="filter-label">
              Outcome{" "}
              <select
                aria-label="Filter activity outcome"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All events</option>
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
                <option value="replayed">Idempotent replay</option>
              </select>
            </label>
          </div>
          <EventTable
            events={w.events.filter(
              (e) => filter === "all" || e.outcome === filter,
            )}
          />
        </section>
      ) : (
        <AuthRequired />
      )}
    </Shell>
  );
}
