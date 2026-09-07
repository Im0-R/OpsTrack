using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OpsTrack.Api;
using OpsTrack.Application;
using OpsTrack.Domain;
using OpsTrack.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var development = builder.Environment.IsDevelopment();
var provider = config["Database:Provider"] ?? "SqlServer";
var connection = config.GetConnectionString("DefaultConnection");
if (provider == "Sqlite")
{
    if (!development && !builder.Environment.IsEnvironment("Testing"))
        throw new InvalidOperationException("SQLite is available only in Development or Testing.");
    builder.Services.AddDbContext<SqliteOpsDbContext>(o => o.UseSqlite(connection ?? "Data Source=opstrack.db"));
    builder.Services.AddScoped<OpsDbContext>(s => s.GetRequiredService<SqliteOpsDbContext>());
}
else if (provider == "SqlServer")
{
    builder.Services.AddDbContext<SqlServerOpsDbContext>(o => o.UseSqlServer(connection
        ?? throw new InvalidOperationException("Configure ConnectionStrings__DefaultConnection for SQL Server."), sql => sql.EnableRetryOnFailure()));
    builder.Services.AddScoped<OpsDbContext>(s => s.GetRequiredService<SqlServerOpsDbContext>());
}
else throw new InvalidOperationException("Database:Provider must be SqlServer or Sqlite.");
var secret = config["Jwt:Secret"];
if (string.IsNullOrEmpty(secret) && !development && !builder.Environment.IsEnvironment("Testing"))
    throw new InvalidOperationException("Configure Jwt__Secret with at least 32 random bytes.");
var key = string.IsNullOrEmpty(secret) ? RandomNumberGenerator.GetBytes(64) : Encoding.UTF8.GetBytes(secret);
if (key.Length < 32) throw new InvalidOperationException("Jwt__Secret must be at least 32 bytes.");
var jwt = new JwtSettings(config["Jwt:Issuer"] ?? "OpsTrack.Api", config["Jwt:Audience"] ?? "OpsTrack.Web", key);
builder.Services.AddSingleton(jwt);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new()
    {
        ValidateIssuer = true,
        ValidIssuer = jwt.Issuer,
        ValidateAudience = true,
        ValidAudience = jwt.Audience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(jwt.Key),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(10)
    };
});
builder.Services.AddAuthorization(o => o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new() { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ITicketStore, TicketStore>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new() { Title = "OpsTrack API", Version = "v1" });
    o.AddSecurityDefinition("Bearer", new() { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
    o.AddSecurityRequirement(new() { [new() { Reference = new() { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>() });
});
var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Cache-Control"] = "no-store";
    await next();
});
if (development)
{
    app.UseSwagger(o => o.RouteTemplate = "openapi/{documentName}.json");
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "OpsTrack API v1"));
}
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "Healthy", service = "OpsTrack.Api" })).AllowAnonymous();
if (config.GetValue<bool>("Database:AutoMigrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<OpsDbContext>();
    await db.Database.MigrateAsync();
    if (development) await DemoSeeder.Seed(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(), config);
}
app.Run();
public partial class Program { }
