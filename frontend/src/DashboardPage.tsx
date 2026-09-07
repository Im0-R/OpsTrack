import { Link } from "react-router-dom";
import { useResource } from "./api";
import { useAuth } from "./auth";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  TicketTable,
} from "./components";
import { label, type Dashboard } from "./types";

export function DashboardPage() {
  const result = useResource<Dashboard>("/dashboard");
  const { session } = useAuth();
  if (result.loading) return <Loading />;
  if (result.error || !result.data)
    return (
      <ErrorState
        message={result.error || "Dashboard unavailable."}
        retry={result.reload}
      />
    );
  const d = result.data;
  const completion = d.total ? Math.round((d.resolved / d.total) * 100) : 0;
  return (
    <>
      <PageHeader
        eyebrow="YOUR TEAM, AT A GLANCE"
        title={`Overview`}
        description={`Welcome back, ${session?.user.name.split(" ")[0]}. Here's where things stand.`}
      >
        <Link className="button primary" to="/tickets/new">
          ＋ Create ticket
        </Link>
      </PageHeader>
      <div className="stats-grid">
        {[
          {
            name: "Total tickets",
            value: d.total,
            hint: "Across your workspace",
            icon: "▤",
            url: "/tickets",
          },
          {
            name: "Open tickets",
            value: d.open,
            hint: "Ready for the next step",
            icon: "◷",
            url: "/tickets?status=Open",
          },
          {
            name: "Needs attention",
            value: d.urgent,
            hint: "High & critical · unresolved",
            icon: "↗",
            url: "/tickets?scope=urgent&sort=priority",
          },
          {
            name: "Resolved & closed",
            value: d.resolved,
            hint: "Work brought to a close",
            icon: "✓",
            url: "/tickets?scope=completed",
          },
        ].map((s, i) => (
          <Link to={s.url} className={"stat-card stat-" + i} key={s.name}>
            <div>
              {s.name}
              <span>{s.icon}</span>
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <small>{s.hint}</small>
          </Link>
        ))}
      </div>
      <div className="insights-grid">
        <section className="panel status-panel">
          <div className="panel-title">
            <h2>Workload by status</h2>
            <span>All tickets</span>
          </div>
          <div className="status-content">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#ad7fd7 0% ${completion}%, #edeaf2 ${completion}% 100%)`,
              }}
            >
              <div>
                <strong>{completion}%</strong>
                <small>completed</small>
              </div>
            </div>
            <div className="legend">
              {d.byStatus.map((s) => (
                <Link to={"/tickets?status=" + s.label} key={s.label}>
                  <span>
                    <i className={s.label.toLowerCase()} />
                    {label(s.label)}
                  </span>
                  <strong>{s.count}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Priority breakdown</h2>
            <span>All tickets</span>
          </div>
          <div className="priority-bars">
            {[...d.byPriority].reverse().map((p) => (
              <Link
                to={"/tickets?priority=" + p.label}
                className="bar-row"
                key={p.label}
              >
                <span>{p.label}</span>
                <div className="bar-track">
                  <i
                    className={p.label.toLowerCase()}
                    style={{
                      width: `${d.total ? (p.count / d.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{p.count}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="panel recent">
        <div className="panel-title">
          <div>
            <h2>Recent tickets</h2>
            <p>The latest work across your team.</p>
          </div>
          <Link className="text-link" to="/tickets">
            View all tickets ↗
          </Link>
        </div>
        {d.recent.length ? <TicketTable tickets={d.recent} /> : <Empty />}
      </section>
      <div className="workspace-tip">
        <span>◇</span>
        <p>
          <strong>Clear ownership. Faster resolutions.</strong> Assign each
          ticket to the person who can move it forward.
        </p>
      </div>
    </>
  );
}
