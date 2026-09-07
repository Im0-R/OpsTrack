using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace OpsTrack.Tests;

public class HealthEndpointTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient client;
    public HealthEndpointTests(ApiFactory factory) => client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsHealthyService()
    {
        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(body);
        Assert.Equal("Healthy", body.Status);
        Assert.Equal("OpsTrack.Api", body.Service);
    }

    private sealed record HealthResponse(string Status, string Service);
}
