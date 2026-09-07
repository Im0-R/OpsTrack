import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useResource } from "./api";
import { useAuth } from "./auth";
import { ErrorState, Loading, PageHeader } from "./components";
import {
  categories,
  label,
  priorities,
  statuses,
  type Person,
  type Ticket,
  type TicketInput,
} from "./types";

export function TicketFormPage() {
  const { id } = useParams();
  return id ? <EditLoader id={id} /> : <TicketForm />;
}
function EditLoader({ id }: { id: string }) {
  const result = useResource<Ticket>("/tickets/" + id);
  const { session } = useAuth();
  if (result.loading) return <Loading />;
  if (result.error || !result.data)
    return (
      <ErrorState
        message={result.error || "Ticket not found."}
        retry={result.reload}
      />
    );
  if (result.data.creator.id !== session?.user.id)
    return <ErrorState message="Only the creator can edit this ticket." />;
  return <TicketForm key={id} ticket={result.data} />;
}
function TicketForm({ ticket }: { ticket?: Ticket }) {
  const navigate = useNavigate();
  const users = useResource<Person[]>("/users");
  const [input, setInput] = useState<TicketInput>(
    ticket
      ? { ...ticket, assigneeId: ticket.assignee?.id || null }
      : {
          title: "",
          description: "",
          category: "Incident",
          priority: "Medium",
          status: "Open",
          assigneeId: null,
          resolutionNote: null,
        },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function set<K extends keyof TicketInput>(key: K, value: TicketInput[K]) {
    setInput((x) => ({ ...x, [key]: value }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<Ticket>(
        ticket ? "/tickets/" + ticket.id : "/tickets",
        { method: ticket ? "PUT" : "POST", body: JSON.stringify(input) },
      );
      navigate("/tickets/" + result.id, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        className="back-link"
        to={ticket ? "/tickets/" + ticket.id : "/tickets"}
      >
        ← Back to {ticket ? "ticket" : "tickets"}
      </Link>
      <PageHeader
        eyebrow="MAKE THE NEXT STEP CLEAR"
        title={ticket ? "Edit ticket" : "Create a ticket"}
        description="Give your team the context they need to take action."
      />
      <form className="ticket-form" onSubmit={submit}>
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        <fieldset disabled={busy}>
          <section className="panel form-section">
            <h2>The essentials</h2>
            <p>A clear title and a little context make all the difference.</p>
            <label>
              Title <span className="required">*</span>
              <input
                value={input.title}
                onChange={(e) => set("title", e.target.value)}
                required
                minLength={3}
                maxLength={160}
                placeholder="e.g. Payment reconciliation delayed"
              />
            </label>
            <label>
              Description <span className="required">*</span>
              <textarea
                value={input.description}
                onChange={(e) => set("description", e.target.value)}
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                placeholder="What happened? Who is affected? What outcome is needed?"
              />
            </label>
          </section>
          <section className="panel form-section">
            <h2>Organization & ownership</h2>
            <div className="form-grid">
              <label>
                Category
                <select
                  value={input.category}
                  onChange={(e) =>
                    set("category", e.target.value as TicketInput["category"])
                  }
                >
                  {categories.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={input.priority}
                  onChange={(e) =>
                    set("priority", e.target.value as TicketInput["priority"])
                  }
                >
                  {priorities.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={input.status}
                  onChange={(e) =>
                    set("status", e.target.value as TicketInput["status"])
                  }
                >
                  {statuses.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assignee
                <select
                  disabled={users.loading || !!users.error}
                  value={input.assigneeId || ""}
                  onChange={(e) => set("assigneeId", e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {users.data?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {users.error && (
              <div>
                <p role="alert" className="alert">
                  {users.error}
                </p>
                <button type="button" className="button" onClick={users.reload}>
                  Reload assignees
                </button>
              </div>
            )}
            <label>
              Resolution note{" "}
              {(input.status === "Resolved" || input.status === "Closed") && (
                <span className="required">*</span>
              )}
              <textarea
                value={input.resolutionNote || ""}
                onChange={(e) => set("resolutionNote", e.target.value || null)}
                required={
                  input.status === "Resolved" || input.status === "Closed"
                }
                maxLength={2000}
                rows={3}
                placeholder="Summarize the fix and how it was verified."
              />
              <small>Required when resolving or closing a ticket.</small>
            </label>
          </section>
          <div className="form-footer">
            <span>
              <span className="required">*</span> Required fields
            </span>
            <div className="actions">
              <Link
                className="button"
                to={ticket ? "/tickets/" + ticket.id : "/tickets"}
              >
                Cancel
              </Link>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : ticket ? "Save changes" : "Create ticket →"}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </>
  );
}
