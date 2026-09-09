import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { webcrypto } from "node:crypto";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");
function sandbox(storage = new Map(), unavailable = false) {
  const modules = new Map();
  const load = (name) => {
    if (modules.has(name)) return modules.get(name);
    const exports = {};
    modules.set(name, exports);
    const code = ts.transpileModule(fs.readFileSync(new URL(`../frontend/src/${name}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, require: path => load(path.replace("./", "")),
      crypto: webcrypto, URLSearchParams, structuredClone, DOMException,
      sessionStorage: {
        getItem: key => { if (unavailable) throw Error("Blocked storage"); return storage.get(key); },
        setItem: (key, value) => { if (unavailable) throw Error("Blocked storage"); storage.set(key, value); },
      },
    });
    return exports;
  };
  return load("demo");
}
const storage = new Map();
const first = sandbox(storage);
const session = first.startDemo();
assert.equal(session.mode, "demo");
assert.equal(first.demoRequest("/dashboard").total, 8);
assert.equal(first.demoRequest("/tickets?scope=urgent").total, 4);
assert.equal(first.demoRequest("/tickets?scope=completed").total, 4);
assert.equal(first.demoRequest("/tickets?search=VPN&status=InProgress").total, 1);
assert.equal(first.demoRequest("/tickets?page=2&pageSize=3").items.length, 3);
const body = { title: "Demo CRUD test", description: "A complete test of editable sample tickets.", category: "Incident", priority: "Critical", status: "Open", assigneeId: "demo-sam", resolutionNote: null };
const ticket = first.demoRequest("/tickets", { method: "POST", body: JSON.stringify(body) });
assert.equal(ticket.creator.id, session.user.id);
assert.equal(ticket.assignee.name, "Sam Rivera");
assert.equal(first.demoRequest("/dashboard").total, 9);
const other = sandbox();
other.startDemo();
assert.equal(other.demoRequest("/dashboard").total, 8, "Another visitor must have independent data");
assert.throws(() => other.demoRequest(`/tickets/${ticket.id}`), /not found/);
const reloaded = sandbox(storage);
assert.equal(reloaded.demoRequest(`/tickets/${ticket.id}`).title, body.title, "Refresh must retain tab edits");
assert.throws(() => reloaded.demoRequest(`/tickets/${ticket.id}`, { method: "PUT", body: JSON.stringify({ ...body, status: "Resolved" }) }), /resolution note/);
reloaded.demoRequest(`/tickets/${ticket.id}`, { method: "PUT", body: JSON.stringify({ ...body, assigneeId: null, status: "Resolved", resolutionNote: "Verified." }) });
assert.equal(reloaded.demoRequest(`/tickets/${ticket.id}`).assignee, null);
assert.equal(reloaded.demoRequest("/dashboard").resolved, 5);
reloaded.demoRequest(`/tickets/${ticket.id}`, { method: "DELETE" });
assert.throws(() => reloaded.demoRequest(`/tickets/${ticket.id}`), /not found/);
for (const item of reloaded.demoRequest("/tickets").items) reloaded.demoRequest(`/tickets/${item.id}`, { method: "DELETE" });
assert.equal(reloaded.demoRequest("/dashboard").total, 0);
assert.equal(sandbox(storage).demoRequest("/dashboard").total, 0, "An empty demo must not silently reseed");
reloaded.resetDemo();
assert.equal(reloaded.demoRequest("/dashboard").total, 8);
assert.throws(() => reloaded.demoRequest("/auth/login", { method: "POST" }), /unavailable/, "Sandbox auth must never fall through to a real server");
const blocked = sandbox(new Map(), true);
blocked.startDemo();
assert.equal(blocked.demoRequest("/dashboard").total, 8);
assert.equal(sandbox(new Map([["opstrack-demo-v1", "invalid json"]])).demoRequest("/dashboard").total, 8);
console.log("PASS: demo CRUD, validation, search, pagination, dashboard, refresh, visitor isolation, reset and unavailable storage.");
