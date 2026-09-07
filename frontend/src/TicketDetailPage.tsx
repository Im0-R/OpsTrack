import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, useResource } from "./api";
import { useAuth } from "./auth";
import { Badge, ConfirmModal, ErrorState, Loading } from "./components";
import { date, label, ticketCode, type Ticket } from "./types";

export function TicketDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const result = useResource<Ticket>("/tickets/" + id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (result.loading) return <Loading />;
  if (result.error || !result.data)
    return (
      <ErrorState
        message={result.error || "Ticket not found."}
        retry={result.reload}
      />
    );
  const ticket = result.data;
  const owner = ticket.creator.id === session?.user.id;
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api("/tickets/" + id, { method: "DELETE" });
      navigate("/tickets", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/tickets">
        ← Back to tickets
      </Link>
      <div className="page-heading detail-heading">
        <div>
          <span className="eyebrow">
            {ticketCode(ticket.id)} · {label(ticket.category)}
          </span>
          <h1>{ticket.title}</h1>
          <p>
            Created {date(ticket.createdAt)} by {ticket.creator.name}
          </p>
        </div>
        {owner && (
          <Link className="button primary" to={`/tickets/${id}/edit`}>
            Edit ticket ↗
          </Link>
        )}
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel prose">
            <h2>Description</h2>
            <p>{ticket.description}</p>
          </section>
          <section className="panel prose">
            <h2>Resolution note</h2>
            <p className={!ticket.resolutionNote ? "subtle" : ""}>
              {ticket.resolutionNote || "No resolution recorded yet."}
            </p>
          </section>
          <div className="ownership-note">
            {owner
              ? "You created this ticket and can update its details, assignment and status."
              : "Only the creator can edit or delete this ticket. Assignment does not grant editing permissions."}
          </div>
        </div>
        <section className="panel ticket-properties">
          <h2>Ticket details</h2>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge value={ticket.status} />
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <Badge value={ticket.priority} />
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{label(ticket.category)}</dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd>{ticket.assignee?.name || "Unassigned"}</dd>
            </div>
            <div>
              <dt>Created by</dt>
              <dd>{ticket.creator.name}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{date(ticket.updatedAt)}</dd>
            </div>
          </dl>
          {owner && (
            <button
              className="button danger-outline full"
              onClick={() => {
                setConfirm(true);
                setError("");
              }}
            >
              Delete ticket
            </button>
          )}
        </section>
      </div>
      {confirm && (
        <ConfirmModal
          busy={busy}
          error={error}
          onCancel={() => setConfirm(false)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
