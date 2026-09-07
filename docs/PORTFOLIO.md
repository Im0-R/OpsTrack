# Presenting OpsTrack

## Project summary

OpsTrack is an internal operations application for reporting incidents and service requests, assigning work and tracking resolution. The MVP uses a layered ASP.NET Core API, EF Core, JWT authentication and a React / TypeScript interface.

## A three-minute demonstration

1. Register or sign in. Explain password hashing, token expiry and protected routes.
2. Open the dashboard. Explain that urgent means high/critical tickets that are still open or in progress.
3. Filter the ticket register and open a ticket. Point out its creator, assignee and resolution note.
4. Create a ticket, assign it, resolve it and show the updated dashboard.
5. Sign in as a second user and demonstrate that viewing is allowed but editing someone else's ticket is rejected by the API.
6. Show the GitHub Actions workflow and tests, then the separate SQL Server and SQLite migrations.

## Engineering decisions to explain

- Domain has no framework dependencies; Application defines DTOs, use cases and a persistence interface; Infrastructure implements EF queries; API composes services and HTTP policies.
- The browser never receives EF entities or password hashes.
- Creator ownership is enforced server-side, independent of whether an edit button is visible.
- Database queries apply filters, sorting and pagination before loading results.
- SQL Server is the deployment database. SQLite supports a lightweight local demonstration; it is not presented as equivalent proof of SQL Server behavior.
- JWTs expire after one hour. The browser keeps them in tab-scoped session storage; there are no refresh tokens. Restarting the local API invalidates tokens when using its generated ephemeral signing key.
- Development seeding is opt-in and requires a locally supplied password. No demo password is stored in Git.
- CI runs integration tests against both providers and builds both Docker images.

## Honest portfolio positioning

Present the repository as an MVP built with AI assistance, and be ready to explain and modify the code yourself. Do not claim production deployment, enterprise identity, audit history or load testing unless you have actually completed them. SQL Server and Docker verification should be described using the real CI result, not merely the presence of a workflow file.

## Future improvements

Azure deployment with managed secrets, an external identity provider, optimistic concurrency, role-based access, audit history and larger-scale observability. Kafka, GraphQL and MongoDB are optional future explorations, not dependencies needed to solve the current problem.
