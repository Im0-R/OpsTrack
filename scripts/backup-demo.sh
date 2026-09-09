#!/bin/bash
# Run on the Linux host from the deployed repository directory.
set -euo pipefail
umask 077
backup_dir="${OPSTRACK_BACKUP_DIR:-/opt/opstrack-backups}"
install -d -m 700 "$backup_dir"
backup_name="opstrack-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.bak"
docker compose exec -T sqlserver sh -c 'mkdir -p /var/opt/mssql/backup'
docker compose exec -T sqlserver sh -c 'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b' <<SQL
BACKUP DATABASE [OpsTrack] TO DISK = N'/var/opt/mssql/backup/$backup_name' WITH COPY_ONLY, CHECKSUM;
RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/backup/$backup_name' WITH CHECKSUM;
GO
SQL
docker compose cp "sqlserver:/var/opt/mssql/backup/$backup_name" "$backup_dir/$backup_name"
chmod 600 "$backup_dir/$backup_name"
printf 'Backup verified and copied to %s/%s\n' "$backup_dir" "$backup_name"
