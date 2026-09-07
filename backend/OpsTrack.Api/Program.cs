var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
var app = builder.Build();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapGet("/api/health", () => Results.Ok(new { status = "Healthy", service = "OpsTrack.Api" }))
    .WithName("GetHealth").WithSummary("Check API availability (database not configured in phase 1).");
app.Run();
public partial class Program { }
