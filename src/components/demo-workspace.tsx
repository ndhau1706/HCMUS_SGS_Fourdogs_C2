"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Server, Users, LockKeyhole, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import type { DemoEngine } from "@/lib/demo/engine";
type State = ReturnType<DemoEngine["view"]>;
const identities = [{ id: "employee", name: "Employee", detail: "Viewer · request operating access" }, { id: "admin-a", name: "Admin A", detail: "Independent approver" }, { id: "admin-b", name: "Admin B", detail: "Independent approver" }, { id: "admin-c", name: "Admin C", detail: "Third eligible approver" }];

export function DemoWorkspace() {
  const [state, setState] = useState<State | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ status: number; text: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/demo/state", { cache: "no-store" });
      if (r.status === 404) { setEnabled(false); return; }
      if (r.status === 401) { setState(null); return; }
      if (r.ok) setState(await r.json());
    } catch { setReply({ status: 503, text: "Demo backend unavailable. Please retry." }); }
  }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 0); const i = setInterval(() => void load(), 3000); return () => { clearTimeout(t); clearInterval(i); }; }, [load]);
  async function action(path: string, body: object = {}) {
    setBusy(true);
    try {
      const r = await fetch(`/api/demo/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await r.json();
      setReply({ status: r.status, text: result.error || result.message });
      await load();
    } catch { setReply({ status: 503, text: "Demo backend unavailable. Please retry." }); }
    finally { setBusy(false); }
  }
  return <div className="demo-app">
    <header className="demo-header"><Link href="/" className="brand"><span className="brand-icon"><ShieldCheck size={25} /></span>CloudGuard</Link><span className="demo-simulation">TideCloak Protection Simulation</span><Link href="/dashboard" className="demo-live-link">Live integration →</Link></header>
    <main className="demo-main">
      <div className="demo-title"><div><span className="eyebrow">SHARED INFRASTRUCTURE · INDEPENDENT AUTHORITY</span><h1>Power to operate. Authority to agree.</h1><p>CloudGuard protects sensitive infrastructure operations through independent authorization.</p></div>{state && <div className="demo-person"><strong>{state.identity.name}</strong><span data-testid="roles">{state.identity.roles.join(" + ")}</span><button onClick={() => void action("logout")} disabled={busy}>End demo session</button></div>}</div>
      <div className="demo-disclosure"><ShieldCheck size={18} /><span>Server-enforced simulation of TideCloak sign-in, roles and 2-of-3 governance. No Tide cryptographic signatures are claimed.</span></div>
      {!enabled ? <section className="demo-panel"><h2>Demo mode is disabled</h2><p>Follow the demo setup instructions in the repository to start this isolated simulation.</p></section> : !state ? <>
        <div className="demo-intro"><article><LockKeyhole /><h2>The trust constraint</h2><p>A single administrator should not decide who can operate shared infrastructure.</p></article><article><Users /><h2>The new possibility</h2><p>Two of three distinct approvers authorize a privilege grant before an employee can act.</p></article></div>
        <section className="demo-panel"><h2>Choose a synthetic demo identity</h2><p>Use separate browser profiles or private windows to represent independent approvers. These are demo identities, with no real credentials.</p><div className="demo-identities">{identities.map(p => <Button key={p.id} variant="outline" disabled={busy} onClick={() => void action("login", { identity: p.id })}><span>{p.name}<small>{p.detail}</small></span><ArrowRight size={17} /></Button>)}</div></section>
      </> : <>
        <div className="demo-grid">
          <section className="demo-panel"><div className="demo-panel-heading"><Server /><h2>Protected infrastructure</h2><span className="chip cyan">SYNTHETIC</span></div><h3 className="demo-resource">web-prod-01</h3><p>Production web gateway · operating privilege required</p><div className="demo-metrics"><span>Required role<strong>infra-operator</strong></span><span>Completed restarts<strong data-testid="restart-count">{state.resource.restarts}</strong></span></div><Button disabled={busy} onClick={() => void action("restart")}><RefreshCw size={17} />Restart web-prod-01</Button><p className="demo-hint">The backend checks the current session and granted role on every attempt.</p></section>
          <section className="demo-panel"><div className="demo-panel-heading"><Users /><h2>Governed privilege grant</h2></div><div className="demo-grant-title"><strong>Employee → infra-operator</strong><span className={`demo-status ${state.request?.status === "AUTHORIZED" ? "authorized" : ""}`} data-testid="request-status">{state.request?.status || "NOT REQUESTED"}</span></div><div className="demo-quorum"><strong data-testid="approval-count">{state.request?.approvals.length ?? 0}<span> / 2</span></strong><div>required approvals<small>from 3 eligible administrators</small></div></div><div className="demo-approvers">{["Admin A", "Admin B", "Admin C"].map(n => <span key={n} className={state.request?.approvals.some(a => a === n) ? "approved" : ""}>{state.request?.approvals.some(a => a === n) ? "✓ " : "○ "}{n}</span>)}</div>{state.identity.id === "employee" ? <Button variant="outline" disabled={busy || !!state.request} onClick={() => void action("request")}>Request infra-operator access</Button> : <Button disabled={busy || !state.request} onClick={() => void action("approve")}>Approve request</Button>}<p className="demo-hint">Each administrator counts once. One approval leaves access blocked.</p></section>
        </div>
        {reply && <div className={`demo-response ${reply.status < 300 ? "success" : "denied"}`} role="status" data-testid="response"><strong>HTTP {reply.status}</strong><span>{reply.text}</span></div>}
        <section className="demo-panel demo-journal"><div className="demo-panel-heading"><LockKeyhole /><h2>Authorization audit trail</h2><Button variant="ghost" onClick={() => void load()} disabled={busy}>Refresh audit</Button></div><div className="demo-events" data-testid="audit">{state.events.slice(0, 8).map(e => <div key={e.sequence}><span>#{String(e.sequence).padStart(2, "0")}</span><strong>{e.actor}</strong><code>{e.action}</code><span className={e.status >= 400 ? "demo-red" : "demo-green"}>{e.status}</span><span>{e.detail}</span></div>)}</div></section>
      </>}
      <footer className="demo-footer"><span>Simulation boundary: application-host trust remains. Live TideCloak uses independent enclave approvals and ORK-backed proofs.</span>{state?.identity.id.startsWith("admin-") && <button onClick={() => void action("reset")} disabled={busy}>Reset synthetic demo</button>}</footer>
    </main>
  </div>;
}
