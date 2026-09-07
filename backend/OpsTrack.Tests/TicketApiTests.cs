using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OpsTrack.Application;
using OpsTrack.Domain;

namespace OpsTrack.Tests;

public sealed class TicketApiTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    { Converters = { new JsonStringEnumConverter() } };
    private static string Password => "Test-only-" + Guid.NewGuid().ToString("N");
    private static TicketInput Valid(TicketStatus status = TicketStatus.Open, TicketPriority priority = TicketPriority.High) => new()
    {
        Title = "Payment processing issue",
        Description = "Reconciliation cannot complete for today's batch.",
        Category = TicketCategory.Incident,
        Priority = priority,
        Status = status,
        ResolutionNote = status is TicketStatus.Resolved or TicketStatus.Closed ? "Verified and restored." : null
    };
    private static async Task<AuthResponse> Register(HttpClient client, string? email = null, string? password = null)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Test Operator", email ?? $"{Guid.NewGuid():N}@example.test", password ?? Password));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        return auth;
    }
    private static async Task<TicketDto> Create(HttpClient client, TicketInput input)
    {
        var response = await client.PostAsJsonAsync("/api/tickets", input, Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        return (await response.Content.ReadFromJsonAsync<TicketDto>(Json))!;
    }

    [Fact]
    public async Task AnonymousAndInvalidTokensCannotReadApplicationData()
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient();
        foreach (var path in new[] { "/api/tickets", "/api/dashboard", "/api/users/me", "/api/users" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", "not-a-valid-token");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/tickets")).StatusCode);
    }

    [Fact]
    public async Task RegistrationLoginAndProfileUseNormalizedEmail()
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient();
        var password = Password;
        var user = await Register(client, "Operator@Example.test", password);
        Assert.Equal("operator@example.test", user.User.Email);
        var duplicate = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("Other Operator", "operator@example.test", password));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        var wrong = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, "incorrect-password"));
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Email, password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var profile = await client.GetFromJsonAsync<UserDto>("/api/users/me");
        Assert.Equal(user.User.Id, profile!.Id);
    }

    [Fact]
    public async Task CreatorCanCreateUpdateResolveAndDelete()
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient();
        var auth = await Register(client);
        var ticket = await Create(client, Valid());
        Assert.Equal(auth.User.Id, ticket.Creator.Id);
        var input = Valid(TicketStatus.Resolved); input.AssigneeId = auth.User.Id;
        var update = await client.PutAsJsonAsync($"/api/tickets/{ticket.Id}", input, Json);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var resolved = (await update.Content.ReadFromJsonAsync<TicketDto>(Json))!;
        Assert.Equal(TicketStatus.Resolved, resolved.Status);
        Assert.Equal(auth.User.Id, resolved.Assignee!.Id);
        input.AssigneeId = null;
        var clear = await client.PutAsJsonAsync($"/api/tickets/{ticket.Id}", input, Json);
        Assert.Null((await clear.Content.ReadFromJsonAsync<TicketDto>(Json))!.Assignee);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/tickets/{ticket.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/tickets/{ticket.Id}")).StatusCode);
    }

    [Fact]
    public async Task AssigneeCanReadButCannotUpdateOrDeleteAnotherCreatorsTicket()
    {
        using var factory = new ApiFactory(); using var owner = factory.CreateClient(); using var other = factory.CreateClient();
        await Register(owner); var assignee = await Register(other);
        var input = Valid(); input.AssigneeId = assignee.User.Id;
        var ticket = await Create(owner, input);
        Assert.Equal(HttpStatusCode.OK, (await other.GetAsync($"/api/tickets/{ticket.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PutAsJsonAsync($"/api/tickets/{ticket.Id}", Valid(), Json)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.DeleteAsync($"/api/tickets/{ticket.Id}")).StatusCode);
        Assert.Equal(ticket.Title, (await owner.GetFromJsonAsync<TicketDto>($"/api/tickets/{ticket.Id}", Json))!.Title);
    }

    [Theory]
    [InlineData("blank")]
    [InlineData("short")]
    [InlineData("enum")]
    [InlineData("resolution")]
    [InlineData("assignee")]
    public async Task InvalidTicketsReturnProblemDetails(string scenario)
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient();
        await Register(client); var input = Valid();
        switch (scenario)
        {
            case "blank": input.Title = "   "; break;
            case "short": input.Description = "short"; break;
            case "enum": input.Priority = (TicketPriority)999; break;
            case "resolution": input.Status = TicketStatus.Resolved; break;
            case "assignee": input.AssigneeId = Guid.NewGuid(); break;
        }
        var response = await client.PostAsJsonAsync("/api/tickets", input, Json);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task DashboardCountsOnlyUnresolvedHighPriorityAsUrgent()
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient(); await Register(client);
        await Create(client, Valid());
        await Create(client, Valid(TicketStatus.InProgress, TicketPriority.Critical));
        await Create(client, Valid(TicketStatus.Resolved, TicketPriority.Critical));
        await Create(client, Valid(TicketStatus.Closed, TicketPriority.Low));
        var data = (await client.GetFromJsonAsync<DashboardDto>("/api/dashboard", Json))!;
        Assert.Equal(4, data.Total); Assert.Equal(1, data.Open); Assert.Equal(2, data.Urgent); Assert.Equal(2, data.Resolved);
        Assert.Equal(4, data.ByStatus.Sum(x => x.Count)); Assert.Equal(4, data.ByPriority.Sum(x => x.Count));
        var urgent = (await client.GetFromJsonAsync<PageDto<TicketDto>>("/api/tickets?scope=urgent", Json))!;
        var completed = (await client.GetFromJsonAsync<PageDto<TicketDto>>("/api/tickets?scope=completed", Json))!;
        Assert.Equal(data.Urgent, urgent.Total); Assert.Equal(data.Resolved, completed.Total);
    }

    [Fact]
    public async Task FiltersPaginationAndOwnershipScopeWorkTogether()
    {
        using var factory = new ApiFactory(); using var client = factory.CreateClient(); using var other = factory.CreateClient();
        await Register(client); await Register(other);
        await Create(client, Valid()); await Create(client, Valid()); await Create(other, Valid());
        var data = (await client.GetFromJsonAsync<PageDto<TicketDto>>("/api/tickets?search=PAYMENT&status=Open&priority=High&category=Incident&mine=true&pageSize=1&page=2&sort=oldest", Json))!;
        Assert.Equal(2, data.Total); Assert.Single(data.Items); Assert.Equal(2, data.Page);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/tickets?page=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/tickets?priority=999")).StatusCode);
    }
}
