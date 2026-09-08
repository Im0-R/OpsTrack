import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Run only against a disposable test stack: this creates two accounts and a ticket.
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8080";

async function request(path, { token, body, method = "GET" } = {}) {
  return fetch(base + path, {
    method,
    signal: AbortSignal.timeout(10_000),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function expectStatus(response, status, action) {
  assert.equal(
    response.status,
    status,
    `${action}: expected ${status}, received ${response.status}`,
  );
  return response;
}

let healthy = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await request("/api/health");
    healthy = response.ok && (await response.json()).status === "Healthy";
    if (healthy) break;
  } catch {
    /* SQL Server and API migrations may still be starting. */
  }
  await delay(2000);
}
assert.ok(healthy, "The full stack did not become healthy through Nginx.");

const page = await expectStatus(
  await request("/tickets"),
  200,
  "SPA deep link",
);
assert.match(
  await page.text(),
  /<div id="root"><\/div>/,
  "Nginx must serve the React entrypoint for client routes.",
);
assert.ok(
  page.headers.get("content-security-policy")?.includes("default-src 'self'"),
);
await expectStatus(
  await request("/api/tickets"),
  401,
  "Anonymous ticket access",
);

const password = randomBytes(24).toString("base64url");
async function register(name) {
  const response = await expectStatus(
    await request("/api/auth/register", {
      method: "POST",
      body: { name, email: `${randomUUID()}@example.test`, password },
    }),
    201,
    "Registration",
  );
  const session = await response.json();
  assert.ok(session.token, "Registration must issue a JWT.");
  return session;
}

const owner = await register("Compose Owner");
const assignee = await register("Compose Assignee");
const login = await expectStatus(
  await request("/api/auth/login", {
    method: "POST",
    body: { email: owner.user.email, password },
  }),
  200,
  "Login",
);
const { token } = await login.json();
const ticketInput = {
  title: `Compose smoke ${randomUUID()}`,
  description:
    "Verify SQL Server, API ownership rules and Nginx routing work together.",
  category: "Incident",
  priority: "Critical",
  status: "Open",
  assigneeId: assignee.user.id,
  resolutionNote: null,
};
const created = await expectStatus(
  await request("/api/tickets", {
    method: "POST",
    token,
    body: ticketInput,
  }),
  201,
  "Ticket creation",
);
const ticket = await created.json();
assert.equal(ticket.assignee.id, assignee.user.id);
assert.equal(ticket.creator.id, owner.user.id);

await expectStatus(
  await request(`/api/tickets/${ticket.id}`, {
    method: "PUT",
    token: assignee.token,
    body: ticketInput,
  }),
  403,
  "Assignee must not gain creator permissions",
);

const filtered = await expectStatus(
  await request(
    `/api/tickets?scope=urgent&search=${encodeURIComponent(ticketInput.title)}`,
    { token },
  ),
  200,
  "Urgent filter",
);
assert.equal((await filtered.json()).total, 1);
await expectStatus(
  await request(`/api/tickets/${ticket.id}`, {
    method: "PUT",
    token,
    body: { ...ticketInput, status: "Resolved" },
  }),
  400,
  "Resolution without a note",
);
await expectStatus(
  await request(`/api/tickets/${ticket.id}`, {
    method: "PUT",
    token,
    body: {
      ...ticketInput,
      status: "Resolved",
      resolutionNote: "Verified through the complete container stack.",
    },
  }),
  200,
  "Ticket resolution",
);

const dashboard = await expectStatus(
  await request("/api/dashboard", { token }),
  200,
  "Dashboard",
);
assert.ok((await dashboard.json()).resolved >= 1);
await expectStatus(
  await request(`/api/tickets/${ticket.id}`, { method: "DELETE", token }),
  204,
  "Creator deletion",
);
await expectStatus(
  await request(`/api/tickets/${ticket.id}`, { token }),
  404,
  "Deleted ticket",
);
console.log(
  "Compose smoke passed: React routing, JWT, SQL persistence, ownership, filters, resolution and deletion.",
);
