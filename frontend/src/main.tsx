import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./styles.css";

function Workspace() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    setStatus("checking");
    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || (await response.json()).status !== "Healthy")
          throw new Error();
        setStatus("online");
      })
      .catch(() => {
        setStatus("offline");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);
  return (
    <div className="layout">
      <aside>
        <Link className="brand" to="/">
          <span className="logo">O</span>OpsTrack<span className="dot">.</span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <Link className="nav active" to="/">
          ▦ <span>Overview</span>
        </Link>
        <div className="sidebar-bottom">
          <span className="avatar">OT</span>
          <div>
            Development workspace<small>Local environment</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <span>
            Workspace <span className="slash">/</span> Overview
          </span>
          <span className="phase">PHASE 01</span>
        </header>
        <section className="content">
          <div className="eyebrow">OPERATIONS, IN FOCUS</div>
          <h1>Your operations workspace.</h1>
          <p className="intro">
            One place for incidents, service requests and the work that keeps
            your team moving.
          </p>
          <div className="connection">
            <div>
              <span className={"signal " + status}></span>
              <strong>API connection</strong>
              <p role="status">
                {status === "online"
                  ? "Connected to the OpsTrack API."
                  : status === "checking"
                    ? "Checking the local API…"
                    : "The API is unavailable. Start the backend and try again."}
              </p>
            </div>
            <button
              disabled={status === "checking"}
              onClick={() => setAttempt((x) => x + 1)}
            >
              Check connection ↗
            </button>
          </div>
          <div className="section-heading">
            <h2>Workspace setup</h2>
            <span>Foundation ready</span>
          </div>
          <div className="cards">
            <article>
              <span className="number">01</span>
              <h3>Connected foundation</h3>
              <p>React and TypeScript, connected to an ASP.NET Core API.</p>
              <span className="tag">Available now</span>
            </article>
            <article>
              <span className="number">02</span>
              <h3>Team access</h3>
              <p>Account registration, secure sign-in and persistent data.</p>
              <span className="tag muted">Next phase</span>
            </article>
            <article>
              <span className="number">03</span>
              <h3>Operational tickets</h3>
              <p>
                Ownership, priorities and a clear view of your team's workload.
              </p>
              <span className="tag muted">Planned</span>
            </article>
          </div>
          <div className="note">
            <strong>A focused start.</strong>
            <p>
              This is the foundation release. Ticket management and
              authentication are not available yet.
            </p>
          </div>
          <footer>
            OpsTrack <span>Operations management · v0.1.0</span>
          </footer>
        </section>
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route
          path="*"
          element={
            <main className="content">
              <h1>Page not found</h1>
              <Link to="/">Return to workspace</Link>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
