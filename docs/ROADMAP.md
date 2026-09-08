# Implementation roadmap

- [x] Phase 1: layered .NET solution, connected React foundation and repository.
- [x] Phase 2: EF Core, separate SQL Server/SQLite migrations, JWT, password hashing, validation and Swagger.
- [x] Phase 3: secured ticket CRUD, creator ownership, assignment, search/filter/pagination and dashboard; unit and integration tests.
- [x] Phase 4: authentication, protected routes, dashboard, register/detail/forms and profile; responsive interface with error/empty/loading states.
- [x] Phase 5 implementation: Docker Compose, Nginx, GitHub Actions and documentation.
- [x] Verify a successful remote SQL Server / Docker CI run: [run 34162426345](https://github.com/Im0-R/OpsTrack/actions/runs/34162426345), commit `ddb49df`.
- [x] Start and exercise the complete Compose stack through Nginx: [run 34199271737](https://github.com/Im0-R/OpsTrack/actions/runs/34199271737), commit `82e391c`.
- [ ] Capture final portfolio screenshots and deploy to a suitable .NET host.

SQL Server and Docker are not installed in the development workspace. Local verification uses SQLite. GitHub Actions successfully ran the same suite against an actual SQL Server instance, built both Docker images and exercised the complete stack through Nginx. Public hosting remains a separate step.

## Scope boundaries

Only creators can edit/delete. Any authenticated user can be assigned and can view the shared workspace. Resolution and closure require a resolution note. Demo data is seeded only in Development, with an explicitly supplied local password and an empty user table.

Role management, audit history, messaging, email, uploads, notifications, Kafka, GraphQL and MongoDB are future work.
