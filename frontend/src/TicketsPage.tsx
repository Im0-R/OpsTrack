import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useResource } from "./api";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  TicketTable,
} from "./components";
import {
  categories,
  label,
  priorities,
  statuses,
  type Page,
  type Ticket,
} from "./types";

export function TicketsPage({ mine = false }: { mine?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  useEffect(() => {
    setSearch(params.get("search") || "");
  }, [params]);
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  const query = new URLSearchParams(params);
  if (mine) query.set("mine", "true");
  const result = useResource<Page<Ticket>>("/tickets?" + query.toString());
  const hasFilters = ["search", "status", "priority", "category", "scope"].some(
    (key) => params.has(key),
  );
  return (
    <>
      <PageHeader
        eyebrow={mine ? "YOUR CONTRIBUTIONS" : "OPERATIONS REGISTER"}
        title={mine ? "My tickets" : "Tickets"}
        description={
          mine
            ? "Every request you’ve created, in one place."
            : "Find the work. Set the priority. Keep it moving."
        }
      >
        <Link className="button primary" to="/tickets/new">
          ＋ Create ticket
        </Link>
      </PageHeader>
      <section className="panel">
        <div className="filters">
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              change("search", search);
            }}
          >
            <label className="sr-only" htmlFor="search">
              Search tickets by title
            </label>
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              maxLength={160}
            />
            <button aria-label="Search tickets" type="submit">
              ⌕
            </button>
          </form>
          {[
            ["status", statuses],
            ["priority", priorities],
            ["category", categories],
          ].map(([key, values]) => (
            <label className="filter-select" key={key as string}>
              <span className="sr-only">{label(key as string)}</span>
              <select
                value={params.get(key as string) || ""}
                onChange={(e) => change(key as string, e.target.value)}
              >
                <option value="">
                  All{" "}
                  {key === "category"
                    ? "categories"
                    : key === "priority"
                      ? "priorities"
                      : "statuses"}
                </option>
                {(values as readonly string[]).map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="list-toolbar">
          <span>
            {result.data ? `${result.data.total} tickets` : "Ticket register"}{" "}
            {params.get("scope") === "urgent" && (
              <span>High & critical · unresolved</span>
            )}
            {params.get("scope") === "completed" && (
              <span>Resolved & closed</span>
            )}
            {hasFilters && (
              <button className="text-link" onClick={() => setParams({})}>
                Clear filters
              </button>
            )}
          </span>
          <label>
            Sort by{" "}
            <select
              value={params.get("sort") || "newest"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
            </select>
          </label>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorState message={result.error} retry={result.reload} />
        ) : result.data?.items.length ? (
          <TicketTable tickets={result.data.items} />
        ) : (
          <Empty
            title={hasFilters ? "No matching tickets" : "No tickets yet"}
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : undefined
            }
          />
        )}{" "}
        {result.data && result.data.total > 0 && (
          <div className="pagination">
            <span>
              Page {result.data.page} of{" "}
              {Math.max(1, Math.ceil(result.data.total / result.data.pageSize))}
            </span>
            <div className="actions">
              <button
                className="button"
                disabled={result.data.page <= 1}
                onClick={() => change("page", String(result.data!.page - 1))}
              >
                ← Previous
              </button>
              <button
                className="button"
                disabled={
                  result.data.page * result.data.pageSize >= result.data.total
                }
                onClick={() => change("page", String(result.data!.page + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
