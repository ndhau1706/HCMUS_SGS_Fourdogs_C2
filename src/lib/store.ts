import { appendFileSync, mkdirSync, statSync, renameSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export type Resource = {
  id: string;
  environment: string;
  service: string;
  cpu: number;
  memory: number;
  startedAt: number;
  lastActivity: string;
  restarts: number;
};
export type Activity = {
  id: string;
  timestamp: string;
  actor: string;
  resource: string;
  action: string;
  outcome: "allowed" | "denied" | "replayed";
  status: number;
};
const now = Date.now();
const initial: Resource[] = [
  {
    id: "web-prod-01",
    environment: "Production",
    service: "Web gateway",
    cpu: 32,
    memory: 48,
    startedAt: now - 14 * 86400000,
    lastActivity: "Synthetic baseline initialized",
    restarts: 0,
  },
  {
    id: "db-prod-01",
    environment: "Production",
    service: "PostgreSQL",
    cpu: 54,
    memory: 72,
    startedAt: now - 28 * 86400000,
    lastActivity: "Synthetic baseline initialized",
    restarts: 0,
  },
  {
    id: "backup-01",
    environment: "Recovery",
    service: "Backup storage",
    cpu: 12,
    memory: 24,
    startedAt: now - 7 * 86400000,
    lastActivity: "Synthetic baseline initialized",
    restarts: 0,
  },
];
type State = {
  resources: Resource[];
  events: Activity[];
  keys: Map<string, { resource: string; expires: number; result: Resource }>;
};
const scope = globalThis as typeof globalThis & { cloudguard?: State };
const state: State = (scope.cloudguard ??= {
  resources: initial,
  events: [],
  keys: new Map(),
});
export function resources() {
  return state.resources.map((r) => ({ ...r }));
}
export function activity() {
  return [...state.events].reverse();
}
export function audit(event: Omit<Activity, "id" | "timestamp">) {
  const record: Activity = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actor: event.actor.slice(0, 150),
    resource: event.resource.slice(0, 80),
    action: event.action.slice(0, 80),
    outcome: event.outcome,
    status: event.status,
  };
  state.events.push(record);
  if (state.events.length > 300) state.events.shift();
  try {
    const dir = join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = join(dir, "activity.jsonl");
    try {
      if (statSync(file).size > 2_000_000)
        renameSync(file, join(dir, "activity.previous.jsonl"));
    } catch {}
    appendFileSync(file, JSON.stringify(record) + "\n", { mode: 0o600 });
  } catch {
    console.error("CloudGuard audit persistence unavailable");
  }
}
export class OperationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function restart(actor: string, id: string, key: string) {
  const resource = state.resources.find((r) => r.id === id);
  if (!resource)
    throw new OperationError(404, "Unknown infrastructure resource.");
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key))
    throw new OperationError(400, "A valid Idempotency-Key is required.");
  const now = Date.now();
  for (const [k, v] of state.keys) if (v.expires < now) state.keys.delete(k);
  const cacheKey = JSON.stringify([actor, key]);
  const old = state.keys.get(cacheKey);
  if (old) {
    if (old.resource !== id)
      throw new OperationError(
        409,
        "Idempotency key belongs to another resource.",
      );
    return { resource: old.result, replayed: true };
  }
  if (now - resource.startedAt < 5000)
    throw new OperationError(
      409,
      "Synthetic restart is cooling down. Try again in five seconds.",
    );
  if (state.keys.size >= 10000)
    throw new OperationError(429, "Operation capacity reached. Try later.");
  resource.startedAt = now;
  resource.restarts++;
  resource.cpu = 8;
  resource.memory = 18;
  resource.lastActivity = "Synthetic restart completed";
  const result = { ...resource };
  state.keys.set(cacheKey, { resource: id, expires: now + 3600000, result });
  return { resource: result, replayed: false };
}
