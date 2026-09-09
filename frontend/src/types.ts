export const statuses = ["Open", "InProgress", "Resolved", "Closed"] as const;
export const priorities = ["Low", "Medium", "High", "Critical"] as const;
export const categories = [
  "Incident",
  "ServiceRequest",
  "Maintenance",
] as const;
export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];
export type Category = (typeof categories)[number];
export type Person = { id: string; name: string };
export type User = Person & { email: string; createdAt: string };
export type Session = { token: string; expiresAt: string; user: User; mode?: "demo" };
export type Ticket = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  creator: Person;
  assignee: Person | null;
  resolutionNote: string | null;
};
export type TicketInput = Pick<
  Ticket,
  | "title"
  | "description"
  | "category"
  | "priority"
  | "status"
  | "resolutionNote"
> & { assigneeId: string | null };
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Dashboard = {
  total: number;
  open: number;
  urgent: number;
  resolved: number;
  byStatus: { label: string; count: number }[];
  byPriority: { label: string; count: number }[];
  recent: Ticket[];
};
export const label = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");
export const date = (value: string) =>
  new Date(value.endsWith("Z") ? value : value + "Z").toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
export const ticketCode = (id: string) => "OT-" + id.slice(0, 6).toUpperCase();
