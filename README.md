# OpsTrack

A small full-stack workspace for tracking incidents and service requests. It lets a team create, assign, prioritise and resolve tickets in one place.

Built as a portfolio MVP with **C# / ASP.NET Core, React, TypeScript, EF Core and SQL Server**.

[![Build and test](https://github.com/Im0-R/OpsTrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Im0-R/OpsTrack/actions/workflows/ci.yml)

[Live demo](https://opstrack.poedle.online/) · [Portfolio case study](https://leopaulvray.com/projects/opstrack)

Click **Try Demo** in the live app to explore the interface immediately. It uses sample data stored only in the browser. You can also create an account with a generated `@example.test` email to test the real API; please use synthetic data only.

## Preview

<p align="center">
  <img src="https://leopaulvray.com/projects/opstrack/dashboard.png" alt="OpsTrack dashboard" width="48%" />
  <img src="https://leopaulvray.com/projects/opstrack/tickets.png" alt="OpsTrack ticket register" width="48%" />
</p>

<p align="center">
  <img src="https://leopaulvray.com/projects/opstrack/create-ticket.png" alt="OpsTrack create ticket form" width="62%" />
</p>

## Features

- Dashboard with ticket counts, completion rate and workload breakdowns.
- Create, assign, update and resolve tickets.
- Search, filters, sorting and pagination.
- Protected routes with JWT authentication.
- Server-side ownership rules: only a ticket's creator can edit or delete it.
- Resolution notes required before closing work.
- Responsive React interface with loading, empty and error states.

## Stack

- **Backend:** .NET 10, C#, ASP.NET Core, Entity Framework Core, JWT and Swagger/OpenAPI
- **Frontend:** React 19, TypeScript, Vite and React Router
- **Data:** SQL Server 2022 for Docker/deployment, SQLite for lightweight local development
- **Delivery:** Docker Compose, Nginx, GitHub Actions and xUnit

The solution separates the API, application logic, domain models and infrastructure. The API exposes DTOs rather than database entities, and filtering, pagination and dashboard calculations run in the database.

## Run locally

Requirements: **.NET 10 SDK** and **Node.js 22.12+**. SQL Server is not required for the default local SQLite mode.

```sh
# Terminal 1
dotnet restore OpsTrack.sln
dotnet run --project backend/OpsTrack.Api --launch-profile http

# Terminal 2
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Swagger is available at [http://localhost:5080/swagger](http://localhost:5080/swagger).

For the Docker and deployment setup, see [deployment and maintenance](docs/DEPLOYMENT.md).

## Checks

GitHub Actions builds the backend and frontend, runs the tests against SQLite and SQL Server, builds the Docker images, and smoke-tests the complete Compose stack through Nginx.

```sh
dotnet build OpsTrack.sln -c Release
dotnet test OpsTrack.sln -c Release
cd frontend && npm ci && npm run build
```

## Next ideas

- Ticket activity history
- Simple team roles
- Optimistic concurrency for simultaneous edits

This is a portfolio MVP, so notifications, uploads, external identity and multi-tenant workspaces are intentionally outside the current scope.
