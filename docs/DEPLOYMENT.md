# Hostinger live demo deployment

Public demo: https://opstrack.poedle.online/. HTTPS, HTTP redirection, browser registration, authenticated API ticket CRUD, deep-link refresh, database persistence across restart and native SQL backup verification have been checked.

## Architecture and prerequisites

Internet → existing HTTPS reverse proxy → `127.0.0.1:18080` → frontend Nginx → API → SQL Server. Only the reverse proxy should expose public HTTP/HTTPS ports. The Compose file does not publish API or database ports.

This procedure requires a Linux server with SSH and Docker support. Before installing anything, inspect OS, architecture, RAM, CPU, disk, Docker/Compose versions, containers, networks, volumes, listening ports, firewall and existing websites. Confirm SQL Server container compatibility and sufficient free resources. Preserve existing proxy configuration and SSH access. Resolve port conflicts before starting the stack.

The live demo uses the existing host Nginx and Certbot. Nginx forwards HTTPS to loopback port 18080; Certbot renews using the webroot challenge and reloads Nginx after renewal. For a different server, use its existing reverse proxy. If none exists and ports 80/443 are free, Caddy is a possible choice. Do not replace existing infrastructure. Inspect and back up configuration before editing it.

## Initial deployment

Clone `https://github.com/Im0-R/OpsTrack` on branch `main` into an unused `/opt/opstrack` directory. If it already exists, inspect its Git status and deployment before changing it. Keep the directory/project name stable because it determines the Compose volume name.

Create `.env` on the server with restrictive permissions (`umask 077`, file mode `600`). Required variables:

- `SQL_SERVER_PASSWORD`: strong random password satisfying SQL Server complexity requirements; avoid connection-string delimiters such as semicolons.
- `JWT_SECRET`: independent cryptographically random secret, at least 32 bytes.

`COMPOSE_FILE` selects the two deployment files as described below. Generate secrets on the server without printing them. Never commit `.env` or copy secrets into images. `.gitignore` already excludes `.env`. Avoid printing `docker compose config` or container environments because they contain resolved secrets.

The API already uses Production, SQL Server and automatic startup migrations. Swagger and development seed accounts are disabled. Run a single API replica for this simple deployment. Review migration changes and back up before updates.

The base Compose configuration selects Developer edition for local use. `docker-compose.demo.yml` selects Express for the hosted demo and sets resource limits and log rotation. SQL Server gets a 2 GiB container limit; size the host for this plus the API, frontend and existing services. Monitor memory, swap and free disk space.

Use the committed `docker-compose.demo.yml` override (Compose 2.24.4+ required for `!override`). Add `COMPOSE_FILE=docker-compose.yml:docker-compose.demo.yml` to the server `.env` so every `docker compose` command loads it automatically. It enables restart policies, resource limits, bounded logs, a frontend-to-API health check and loopback port 18080. Do not add database/API port mappings.

```sh
cd /opt/opstrack
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
curl --fail http://127.0.0.1:18080/
curl --fail http://127.0.0.1:18080/api/health
```

Health is a process check, not a database-readiness check. Verify registration, login and authenticated ticket creation/read/update/delete before exposure. The existing `scripts/smoke-compose.mjs` is for a disposable test stack and leaves two accounts; do not run it blindly against an existing database.

## Domain and HTTPS

Use the actual domain supplied by the owner. Create an A record for `opstrack` pointing to the server public IPv4. Check any AAAA record too: it must reach the same deployment or be corrected.

If Caddy is selected after inspection, add a site block to its existing configuration using the real hostname:

```caddyfile
opstrack.example.com {
    reverse_proxy 127.0.0.1:18080
}
```

The hostname above is a placeholder. Validate configuration before reloading. Verify certificate issuance, automatic renewal and HTTP-to-HTTPS redirection. A containerized proxy cannot reach the host using its own `127.0.0.1`; adapt networking to the inspected installation instead.

## Validation before announcing the demo

Verify HTTPS certificate validity, HTTP redirect, React assets and deep-link refresh, API routing, login/registration, authenticated ticket CRUD and absence of mixed content. Create a verification ticket, restart only this Compose stack, log in again and confirm the same ticket remains before deleting it. Check existing websites still work and independently confirm internal ports are inaccessible from the Internet.

The verified Live Demo URL is linked from the README. Repeat these checks after material deployment changes.

## Manual database backup

Before an important update, run `bash scripts/backup-demo.sh` from `/opt/opstrack`. It creates a SQL Server native full backup, verifies it and copies it outside the repository with restricted permissions. The equivalent manual procedure is:

```sh
set -eu
umask 077
backup_name="opstrack-$(date -u +%Y%m%dT%H%M%SZ).bak"
install -d -m 700 /opt/opstrack-backups
docker compose exec -T sqlserver sh -c 'mkdir -p /var/opt/mssql/backup'
docker compose exec -T sqlserver sh -c 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b' <<SQL
BACKUP DATABASE [OpsTrack] TO DISK = N'/var/opt/mssql/backup/$backup_name' WITH COPY_ONLY, CHECKSUM;
RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/backup/$backup_name' WITH CHECKSUM;
GO
SQL
docker compose cp "sqlserver:/var/opt/mssql/backup/$backup_name" "/opt/opstrack-backups/$backup_name"
chmod 600 "/opt/opstrack-backups/$backup_name"
```

Keep backups outside Git, restrict directory access, and copy them to protected off-server storage. VERIFYONLY does not replace a test restore: periodically restore to a separate test database/server. Monitor disk usage; the procedure retains both container and host copies. Remove older copies only after confirming recoverable backups exist. Never automatically delete Docker volumes.

## Update, logs and restart

Record the current commit (`git rev-parse HEAD`), review incoming changes and take a backup first. With a clean checkout on `main`:

```sh
cd /opt/opstrack
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100
```

Repeat health and authenticated application checks. View ongoing logs with `docker compose logs -f --tail=100`. Restart this app with `docker compose restart`. Restart does not rebuild images or apply environment changes; use `up -d --build` for those.

The `sql-data` named volume survives container recreation and `docker compose down`. Never use `down -v`, volume removal or volume pruning. A persistent volume is not a backup.

For rollback, retain the prior commit and images. Redeploy the prior version only after checking database-schema compatibility. If migrations are incompatible, plan a restore from the pre-update backup during a controlled outage; do not overwrite the running database blindly. Restoring loses writes made after that backup.

## Troubleshooting and demo improvements

- Gateway errors: inspect API/frontend logs, startup migration errors and SQL health; verify the chosen localhost port and proxy routing.
- TLS errors: check DNS A/AAAA, public reachability on 80/443 and proxy logs without disabling the firewall.
- SQL startup failures: check available memory/disk, architecture and password configuration. Changing `.env` alone does not rotate the password in an existing SQL volume.
- Authentication throttling: the API currently sees the Nginx peer address, so visitors share its rate-limit bucket. Configure trusted proxy forwarding deliberately before scaling public use; never trust arbitrary client forwarding headers.
- The API currently connects as `sa`. Move to a dedicated application identity with limited privileges and separate migration credentials as a hardening step.
- Public accounts share one workspace. Use only synthetic data; there is no tenant isolation or automatic demo reset. Try Demo now uses a separate browser-only sandbox with eight sample tickets, tab storage and a reset button. Its session marker is not a JWT and is never sent to the backend; all demo requests stay in the browser. Registered accounts still use the real API and shared SQL workspace. The registration form can generate a fictional email identifier; the existing email-format and password validation remain in place. Do not enable Development in public hosting to obtain seed data.

Keep operational validation results and actual host details outside the public repository. A successful process health check alone does not certify the deployment.
