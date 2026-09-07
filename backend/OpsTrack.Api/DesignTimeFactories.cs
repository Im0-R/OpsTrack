using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using OpsTrack.Infrastructure;

namespace OpsTrack.Api;

// Separate context types keep provider-specific migrations and snapshots independent.
public sealed class SqlServerFactory : IDesignTimeDbContextFactory<SqlServerOpsDbContext>
{
    public SqlServerOpsDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<SqlServerOpsDbContext>()
        .UseSqlServer(Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=OpsTrack;Integrated Security=True;TrustServerCertificate=True").Options);
}

public sealed class SqliteFactory : IDesignTimeDbContextFactory<SqliteOpsDbContext>
{
    public SqliteOpsDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<SqliteOpsDbContext>()
        .UseSqlite(Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") ?? "Data Source=opstrack.db").Options);
}
