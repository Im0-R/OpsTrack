import { categories, priorities, statuses, type Session, type Ticket, type TicketInput } from "./types";

const storageKey = "opstrack-demo-v1";
const owner = { id: "demo-alex", name: "Alex Morgan", email: "alex@example.test", createdAt: "2026-01-12T09:00:00Z" };
const people = [owner, { id: "demo-sam", name: "Sam Rivera" }, { id: "demo-jordan", name: "Jordan Lee" }];
let memory: Ticket[] | undefined;
const completed = (t: Ticket) => t.status === "Resolved" || t.status === "Closed";
const urgent = (t: Ticket) => !completed(t) && (t.priority === "High" || t.priority === "Critical");

function persist(tickets: Ticket[]) {
  memory = tickets;
  try { sessionStorage.setItem(storageKey, JSON.stringify(tickets)); } catch { /* Remain usable in memory. */ }
}

export function resetDemo() {
  const examples = [
    ["Payment reconciliation delayed", "Finance cannot close yesterday's accounts because the payment provider export is two hours late. Check the import job and reconcile the missing transactions."],
    ["VPN access for new starters", "Three colleagues join the support team on Monday. Provision VPN access, confirm their group memberships and share the onboarding guide."],
    ["Scheduled database maintenance", "Apply the approved index maintenance during the Sunday window. Notify the support team and record the checks performed after the change."],
    ["Reporting dashboard unavailable", "The regional dashboard returns an error during the morning review. Restore access and confirm the daily figures with the operations lead."],
    ["Provision finance shared workspace", "Create a shared workspace for the quarterly review. Assign the finance group and verify that confidential folders have the correct permissions."],
    ["Nightly backup verification", "Restore last night's backup into the test environment. Check the record counts and document the recovery time before the next release."],
    ["Invoice export format mismatch", "The accounting import rejects invoice dates in the latest export. Align the format with the agreed specification and test a sample batch."],
    ["Replace meeting room workstation", "The meeting room workstation freezes during video calls. Replace the device, reconnect the display and test a call with the office team."],
  ];
  persist(examples.map(([title, description], i): Ticket => ({
    id: crypto.randomUUID(), title, description,
    category: categories[i % categories.length], priority: priorities[(i + 2) % priorities.length], status: statuses[i % statuses.length],
    creator: owner, assignee: i === 4 ? null : people[i % people.length],
    createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
    resolutionNote: i % 4 >= 2 ? "Change verified with the requesting team. Service is operating normally." : null,
  })));
}

export function startDemo(): Session {
  resetDemo();
  return { mode: "demo", token: "browser-demo-not-a-server-token", user: owner, expiresAt: new Date(Date.now() + 3600000).toISOString() };
}

function tickets() {
  if (!memory) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored) && stored.every(t => typeof t.id === "string" && typeof t.title === "string" && t.creator?.id && statuses.includes(t.status) && priorities.includes(t.priority))) memory = stored;
    } catch { /* Start afresh if storage is unavailable or corrupted. */ }
    if (!memory) resetDemo();
  }
  return memory!;
}

// This sandbox never calls the server or grants a real authentication token.
export function demoRequest(path: string, options: RequestInit = {}): unknown {
  if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const [route, query] = path.split("?");
  const params = new URLSearchParams(query);
  const method = options.method || "GET";
  const rows = tickets();
  if (method === "GET" && route === "/users/me") return structuredClone(owner);
  if (method === "GET" && route === "/users") return structuredClone(people);
  if (method === "GET" && route === "/dashboard") return {
    total: rows.length, open: rows.filter(t => t.status === "Open").length,
    urgent: rows.filter(urgent).length, resolved: rows.filter(completed).length,
    byStatus: statuses.map(label => ({ label, count: rows.filter(t => t.status === label).length })),
    byPriority: priorities.map(label => ({ label, count: rows.filter(t => t.priority === label).length })),
    recent: structuredClone([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)),
  };
  if (method === "GET" && route === "/tickets") {
    let filtered = rows.filter(t =>
      (!params.get("search") || t.title.toLowerCase().includes(params.get("search")!.trim().toLowerCase())) &&
      (!params.get("status") || t.status === params.get("status")) &&
      (!params.get("priority") || t.priority === params.get("priority")) &&
      (!params.get("category") || t.category === params.get("category")) &&
      (params.get("mine") !== "true" || t.creator.id === owner.id) &&
      (params.get("scope") !== "urgent" || urgent(t)) &&
      (params.get("scope") !== "completed" || completed(t)));
    filtered = filtered.sort((a, b) => {
      const priority = params.get("sort") === "priority" ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority) : 0;
      return priority || (params.get("sort") === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)) || a.id.localeCompare(b.id);
    });
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 10));
    return structuredClone({ items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize });
  }
  const id = route.startsWith("/tickets/") ? route.slice("/tickets/".length) : null;
  const existing = id ? rows.find(t => t.id === id) : undefined;
  if (id && !existing) throw new Error("Ticket not found. The demo may have been reset.");
  if (id && method === "GET") return structuredClone(existing);
  if (id && method === "DELETE") {
    persist(rows.filter(t => t.id !== id));
    return undefined;
  }
  if ((route === "/tickets" && method === "POST") || (existing && method === "PUT")) {
    const input = JSON.parse(String(options.body)) as TicketInput;
    if (!input.title || input.title.trim().length < 3 || input.title.length > 160) throw new Error("Title must contain 3–160 characters.");
    if (!input.description || input.description.trim().length < 10 || input.description.length > 5000) throw new Error("Description must contain 10–5000 characters.");
    if (!statuses.includes(input.status) || !priorities.includes(input.priority) || !categories.includes(input.category)) throw new Error("Choose a valid status, priority and category.");
    if ((input.status === "Resolved" || input.status === "Closed") && !input.resolutionNote?.trim()) throw new Error("A resolution note is required for resolved or closed tickets.");
    if ((input.resolutionNote?.length || 0) > 2000) throw new Error("Resolution note must be at most 2000 characters.");
    const assignee = people.find(p => p.id === input.assigneeId) || null;
    if (input.assigneeId && !assignee) throw new Error("Choose an available assignee.");
    const now = new Date().toISOString();
    const ticket: Ticket = { id: existing?.id || crypto.randomUUID(), title: input.title.trim(), description: input.description.trim(), category: input.category, priority: input.priority, status: input.status, resolutionNote: input.resolutionNote?.trim() || null, creator: owner, assignee, createdAt: existing?.createdAt || now, updatedAt: now };
    persist(existing ? rows.map(t => t.id === existing.id ? ticket : t) : [...rows, ticket]);
    return structuredClone(ticket);
  }
  throw new Error("This action is unavailable in the demo. Exit the demo to use your account.");
}
