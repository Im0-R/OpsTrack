# Implementation roadmap

1. **Foundation:** layered .NET solution, React workspace, configuration examples, API connectivity and local instructions.
2. **Backend foundation:** User and Ticket entities, SQL Server, EF Core migrations, validation, registration/login, JWT and Swagger authentication. Verify account flows before proceeding.
3. **Ticket API:** secured CRUD, creator-only update/delete, assignees, search, filters, pagination and dashboard calculations. Add meaningful unit and authorization tests.
4. **React application:** protected routes, registration/login, dashboard, ticket list/detail/forms and profile. Include loading, empty and error states, accessible confirmation dialogs and responsive layouts.
5. **Delivery:** Docker Compose (SQL Server, API, frontend), GitHub Actions for restore/build/test, screenshots and final documentation.

## Acceptance rules for the MVP

- Authenticated users can read and create tickets.
- Only a ticket's creator can edit or delete it.
- Any authenticated user may be assigned; assignment alone grants no edit permission.
- Categories: Incident, Service Request, Maintenance.
- Priorities: Low, Medium, High, Critical.
- Statuses: Open, In Progress, Resolved, Closed.
- Resolution notes, timestamps, creator and assignee are visible on ticket details.
- Demo users and data are seeded in local development only; credentials must not be committed.
- No messaging, email, uploads, notifications or advanced role management.
