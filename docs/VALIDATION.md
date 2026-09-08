# MVP validation record

## Verified release

Commit: `82e391c02335475e4f8d1ee11560c26bc3c3ce70`.

[GitHub Actions run 34199271737](https://github.com/Im0-R/OpsTrack/actions/runs/34199271737) completed successfully.

| Check | Result |
| --- | --- |
| .NET restore and Release build | Passed |
| Unit and API integration suite, SQLite | 16 passed |
| Same suite with an actual SQL Server instance | 16 passed |
| Clean npm install and TypeScript/Vite build | Passed |
| Frontend Docker image build | Passed |
| API Docker image build | Passed |
| Full Compose startup and HTTP smoke check through Nginx | Passed |

The workflow retains TRX reports as artifacts. Database tests create and delete isolated test databases; they do not use the local demonstration database.

## Local functional checks

- Development migrations and optional seed applied successfully.
- JWT login, authenticated dashboard, Swagger and the Vite API proxy responded successfully.
- Browser checks covered sign-in, ticket creation, ticket detail, editing and saving a resolution note.
- The sample ticket changed from Open to Resolved and displayed the saved note.

## Remaining checks

- Capture final desktop and mobile screenshots for the portfolio.
- Select and configure a public .NET hosting environment, including HTTPS and managed secrets.

The Compose smoke check verifies the React entrypoint on a deep link, JWT registration/login, SQL persistence, creator ownership, filters, required resolution notes, dashboard aggregation and deletion. It does not replace a full browser regression suite or validate a public hosting environment.
