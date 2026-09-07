import { useEffect, useState } from "react";
import type { Session } from "./types";

export function readSession(): Session | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("opstrack-session") || "null",
    ) as Session | null;
    if (
      value?.token &&
      value.user?.id &&
      Date.parse(value.expiresAt) > Date.now()
    )
      return value;
  } catch {
    /* An unavailable or malformed browser store starts a new session. */
  }
  return null;
}
export function saveSession(value: Session | null) {
  try {
    value
      ? sessionStorage.setItem("opstrack-session", JSON.stringify(value))
      : sessionStorage.removeItem("opstrack-session");
  } catch {
    /* The current in-memory session still works. */
  }
  activeSession = value;
}
let activeSession = readSession();

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (activeSession)
    headers.set("Authorization", `Bearer ${activeSession.token}`);
  let response: Response;
  try {
    response = await fetch("/api" + path, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new Error(
      "Unable to reach OpsTrack. Check your connection and try again.",
    );
  }
  if (response.status === 401 && !path.startsWith("/auth")) {
    saveSession(null);
    window.dispatchEvent(new Event("opstrack-expired"));
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const fields = problem?.errors
      ? Object.values(problem.errors).flat().join(" ")
      : "";
    throw new Error(
      fields ||
        problem?.title ||
        (response.status === 429
          ? "Too many attempts. Please wait a minute."
          : "The request could not be completed."),
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function useResource<T>(path: string) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload: () => setRevision((x) => x + 1) };
}
