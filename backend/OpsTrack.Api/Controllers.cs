using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using OpsTrack.Application;
using OpsTrack.Infrastructure;

namespace OpsTrack.Api;

[ApiController, Route("api/auth"), AllowAnonymous, EnableRateLimiting("auth")]
public sealed class AuthController(AuthService service) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct) => StatusCode(201, await service.Register(request, ct));
    [HttpPost("login")]
    public Task<AuthResponse> Login(LoginRequest request, CancellationToken ct) => service.Login(request, ct);
}

[ApiController, Route("api/users"), Authorize]
public sealed class UsersController(OpsDbContext db) : ControllerBase
{
    [HttpGet("me")]
    public async Task<UserDto> Me(CancellationToken ct) => (await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == CurrentUser.Id(User), ct)
        ?? throw new AppException(401, "Your account is unavailable. Please sign in again.")).ToDto();
    [HttpGet]
    public async Task<List<PersonDto>> List(CancellationToken ct) => await db.Users.AsNoTracking().OrderBy(x => x.Name).Select(x => new PersonDto(x.Id, x.Name)).ToListAsync(ct);
}

[ApiController, Route("api/tickets"), Authorize]
public sealed class TicketsController(TicketService service) : ControllerBase
{
    [HttpGet]
    public Task<PageDto<TicketDto>> List([FromQuery] TicketQuery query, CancellationToken ct) => service.List(query, CurrentUser.Id(User), ct);
    [HttpGet("{id:guid}")]
    public Task<TicketDto> Get(Guid id, CancellationToken ct) => service.Get(id, ct);
    [HttpPost]
    public async Task<ActionResult<TicketDto>> Create(TicketInput input, CancellationToken ct)
    {
        var ticket = await service.Create(input, CurrentUser.Id(User), ct);
        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, ticket);
    }
    [HttpPut("{id:guid}")]
    public Task<TicketDto> Update(Guid id, TicketInput input, CancellationToken ct) => service.Update(id, input, CurrentUser.Id(User), ct);
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await service.Delete(id, CurrentUser.Id(User), ct);
        return NoContent();
    }
}

[ApiController, Route("api/dashboard"), Authorize]
public sealed class DashboardController(TicketService service) : ControllerBase
{
    [HttpGet] public Task<DashboardDto> Get(CancellationToken ct) => service.Dashboard(ct);
}

internal static class CurrentUser
{
    public static Guid Id(ClaimsPrincipal user) => Guid.TryParse(user.FindFirstValue("sub"), out var id) ? id : throw new AppException(401, "Invalid session.");
}
