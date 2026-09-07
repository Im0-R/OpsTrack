using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OpsTrack.Infrastructure;

namespace OpsTrack.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string database = Path.Combine(Path.GetTempPath(), $"opstrack-test-{Guid.NewGuid():N}.db");
    private string? sqlConnection;
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());
        var sql = Environment.GetEnvironmentVariable("TEST_SQL_CONNECTION");
        if (!string.IsNullOrWhiteSpace(sql))
        {
            var connection = new SqlConnectionStringBuilder(sql) { InitialCatalog = "OpsTrackTest_" + Guid.NewGuid().ToString("N") };
            sqlConnection = connection.ConnectionString;
        }
        builder.UseSetting("Database:Provider", sqlConnection is null ? "Sqlite" : "SqlServer");
        builder.UseSetting("Database:AutoMigrate", "true");
        builder.UseSetting("ConnectionStrings:DefaultConnection", sqlConnection ?? $"Data Source={database};Pooling=False");
    }
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && File.Exists(database)) File.Delete(database);
        if (disposing && sqlConnection is not null)
        {
            using var db = new SqlServerOpsDbContext(new DbContextOptionsBuilder<SqlServerOpsDbContext>().UseSqlServer(sqlConnection).Options);
            db.Database.EnsureDeleted();
        }
    }
}
