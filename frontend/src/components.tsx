import { useEffect, useRef, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { date, label, ticketCode, type Ticket } from "./types";

export function Shell() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const section = location.pathname.startsWith("/tickets")
    ? "Tickets"
    : location.pathname === "/profile"
      ? "My profile"
      : "Overview";
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="logo">O</span>OpsTrack
          <span className="brand-dot">.</span>
        </Link>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          <NavLink to="/" end>
            <span>▦</span>Overview
          </NavLink>
          <NavLink to="/tickets">
            <span>▤</span>Tickets
          </NavLink>
          <NavLink to="/profile">
            <span>◉</span>My profile
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="tiny-dot" />A little more clarity.
          <p>A lot less chasing.</p>
        </div>
        <div className="account">
          <span className="avatar">
            {session?.user.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{session?.user.name}</strong>
            <small>Team member</small>
          </div>
          <button title="Sign out" aria-label="Sign out" onClick={signOut}>
            ↪
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            Workspace <span>/</span> <strong>{section}</strong>
          </div>
          <span className="workspace-label">
            <i /> Operations workspace
          </span>
        </header>
        <main id="main" className="main-content">
          <Outlet />
        </main>
        <footer>
          OpsTrack <span>Built for better operations.</span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      <i />
      {label(value)}
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      Loading your workspace…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="state">
      <div role="alert" className="alert">
        {message}
      </div>
      {retry && (
        <button className="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({
  title = "No tickets yet",
  description = "Create a ticket to start tracking your team’s work.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="state empty">
      <span className="empty-icon">▤</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="button primary" to="/tickets/new">
        ＋ Create ticket
      </Link>
    </div>
  );
}
export function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Created</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>
                <Link className="ticket-title" to={"/tickets/" + t.id}>
                  <small>
                    {ticketCode(t.id)} <span>· {label(t.category)}</span>
                  </small>
                  <strong>{t.title}</strong>
                </Link>
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td>
                <Badge value={t.priority} />
              </td>
              <td>
                {t.assignee ? (
                  <span className="person">
                    <span className="avatar small">
                      {t.assignee.name.slice(0, 2).toUpperCase()}
                    </span>
                    {t.assignee.name}
                  </span>
                ) : (
                  <span className="subtle">Unassigned</span>
                )}
              </td>
              <td className="subtle nowrap">{date(t.createdAt)}</td>
              <td>
                <Link aria-label={"View " + t.title} to={"/tickets/" + t.id}>
                  ↗
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function ConfirmModal({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">Delete this ticket?</h2>
      <p>
        This permanently removes the ticket and its resolution note. This action
        cannot be undone.
      </p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button autoFocus className="button" disabled={busy} onClick={onCancel}>
          Keep ticket
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Deleting…" : "Delete ticket"}
        </button>
      </div>
    </dialog>
  );
}
