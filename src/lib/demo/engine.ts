// Deliberate simulation: server-enforced workflow, never a Tide signature or token.
import { randomBytes } from "node:crypto";

export const people = {
  employee: { name: "Employee", role: "viewer" },
  "admin-a": { name: "Admin A", role: "administrator" },
  "admin-b": { name: "Admin B", role: "administrator" },
  "admin-c": { name: "Admin C", role: "administrator" },
} as const;
export type Person = keyof typeof people;
export type DemoEvent = { sequence: number; actor: string; action: string; status: number; detail: string };
export class DemoError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class DemoEngine {
  private sessions = new Map<string, { person: Person; expires: number }>();
  private approvals = new Set<Person>();
  private requested = false;
  private operator = false;
  private restarts = 0;
  private events: DemoEvent[] = [];
  private log(actor: Person, action: string, status: number, detail: string) {
    this.events.push({ sequence: (this.events.at(-1)?.sequence ?? 0) + 1, actor: people[actor].name, action, status, detail });
    if (this.events.length > 100) this.events.shift();
  }
  login(value: unknown) {
    if (typeof value !== "string" || !Object.hasOwn(people, value)) throw new DemoError(400, "Choose a synthetic demo identity.");
    for (const [key, s] of this.sessions) if (s.expires < Date.now()) this.sessions.delete(key);
    if (this.sessions.size >= 1000) throw new DemoError(429, "Demo session limit reached.");
    const person = value as Person, token = randomBytes(32).toString("hex");
    this.sessions.set(token, { person, expires: Date.now() + 3600000 });
    this.log(person, "demo.sign-in", 200, "Synthetic identity; isolated browser session");
    return token;
  }
  identify(token: string | undefined): Person {
    const s = token ? this.sessions.get(token) : undefined;
    if (!s || s.expires < Date.now()) throw new DemoError(401, "Choose a demo identity first.");
    return s.person;
  }
  logout(token: string) { this.sessions.delete(token); }
  view(person: Person) {
    return {
      mode: "TideCloak Protection Simulation",
      identity: { id: person, name: people[person].name, roles: person === "employee" ? ["viewer", ...(this.operator ? ["infra-operator"] : [])] : ["administrator"] },
      request: this.requested ? { id: "CG-001", subject: "Employee", role: "infra-operator", status: this.operator ? "AUTHORIZED" : "PENDING", approvals: [...this.approvals].map(a => people[a].name), required: 2, eligible: 3 } : null,
      resource: { id: "web-prod-01", service: "Web gateway", restarts: this.restarts },
      events: [...this.events].reverse(),
    };
  }
  request(person: Person) {
    if (person !== "employee") throw new DemoError(403, "Only Employee can request their own demo privilege.");
    if (this.requested) throw new DemoError(409, "The access request already exists.");
    this.requested = true;
    this.log(person, "grant.requested", 202, "infra-operator requested; 0 of 2 approvals");
    return { status: 202, message: "Request CG-001 created. Two distinct administrators must approve." };
  }
  approve(person: Person) {
    if (person === "employee") { this.log(person, "approval.denied", 403, "Employee is not an approver"); throw new DemoError(403, "An administrator session is required."); }
    if (!this.requested) throw new DemoError(409, "No access request exists.");
    if (this.approvals.has(person)) { this.log(person, "approval.duplicate", 409, "Duplicate identity rejected; approval count unchanged"); throw new DemoError(409, "Already approved by this administrator. Duplicate approval does not count."); }
    if (this.operator) throw new DemoError(409, "Request already authorized.");
    this.approvals.add(person);
    this.log(person, "approval.recorded", 200, `${this.approvals.size} of 2 distinct approvals`);
    if (this.approvals.size >= 2) { this.operator = true; this.log(person, "grant.applied", 200, "Quorum reached; Employee granted infra-operator by server policy"); }
    return { status: 200, message: this.operator ? "2 of 2 approvals. Employee is now infra-operator." : "1 of 2 approvals. Request remains pending; operations stay blocked." };
  }
  restart(person: Person) {
    if (person !== "employee" || !this.operator) { this.log(person, "restart.denied", 403, "infra-operator required; resource unchanged"); throw new DemoError(403, "Forbidden: infra-operator required. No restart executed."); }
    this.restarts++;
    this.log(person, "restart.allowed", 200, `Synthetic web-prod-01 restart #${this.restarts} completed`);
    return { status: 200, message: "Synthetic restart completed. No real infrastructure was contacted." };
  }
  reset(person: Person) {
    if (person === "employee") throw new DemoError(403, "Administrator required to reset synthetic data.");
    this.approvals.clear(); this.requested = false; this.operator = false; this.restarts = 0; this.events = [];
    this.log(person, "demo.reset", 200, "Deterministic baseline: Employee is viewer; no pending grant");
    return { status: 200, message: "Synthetic demo reset. Employee starts as viewer." };
  }
}
const scope = globalThis as typeof globalThis & { cloudguardDemo?: DemoEngine };
export const demoEngine = scope.cloudguardDemo ??= new DemoEngine();
