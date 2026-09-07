using System.ComponentModel.DataAnnotations;
using OpsTrack.Domain;

namespace OpsTrack.Application;

public sealed record UserDto(Guid Id, string Name, string Email, DateTime CreatedAt);
public sealed record PersonDto(Guid Id, string Name);
public sealed record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
public sealed record RegisterRequest(
    [Required, StringLength(80, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 12)] string Password);
public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128)] string Password);

public sealed class TicketInput : IValidatableObject
{
    [Required, StringLength(160, MinimumLength = 3)] public string Title { get; set; } = "";
    [Required, StringLength(5000, MinimumLength = 10)] public string Description { get; set; } = "";
    [EnumDataType(typeof(TicketCategory))] public TicketCategory Category { get; set; }
    [EnumDataType(typeof(TicketPriority))] public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    [EnumDataType(typeof(TicketStatus))] public TicketStatus Status { get; set; }
    public Guid? AssigneeId { get; set; }
    [StringLength(2000)] public string? ResolutionNote { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if ((Title?.Trim().Length ?? 0) < 3) yield return new("Title must contain at least 3 characters.", [nameof(Title)]);
        if ((Description?.Trim().Length ?? 0) < 10) yield return new("Description must contain at least 10 characters.", [nameof(Description)]);
        if (Status is TicketStatus.Resolved or TicketStatus.Closed && string.IsNullOrWhiteSpace(ResolutionNote))
            yield return new("A resolution note is required for resolved or closed tickets.", [nameof(ResolutionNote)]);
    }
}

public sealed class TicketQuery
{
    [StringLength(160)] public string? Search { get; set; }
    [EnumDataType(typeof(TicketStatus))] public TicketStatus? Status { get; set; }
    [EnumDataType(typeof(TicketPriority))] public TicketPriority? Priority { get; set; }
    [EnumDataType(typeof(TicketCategory))] public TicketCategory? Category { get; set; }
    [RegularExpression("^(newest|oldest|priority)$")] public string Sort { get; set; } = "newest";
    public bool Mine { get; set; }
    [RegularExpression("^(all|urgent|completed)$")] public string Scope { get; set; } = "all";
    [Range(1, 100000)] public int Page { get; set; } = 1;
    [Range(1, 100)] public int PageSize { get; set; } = 10;
}

public sealed record TicketDto(Guid Id, string Title, string Description, TicketCategory Category,
    TicketPriority Priority, TicketStatus Status, DateTime CreatedAt, DateTime UpdatedAt,
    PersonDto Creator, PersonDto? Assignee, string? ResolutionNote);
public sealed record PageDto<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
public sealed record CountDto(string Label, int Count);
public sealed record DashboardDto(int Total, int Open, int Urgent, int Resolved,
    IReadOnlyList<CountDto> ByStatus, IReadOnlyList<CountDto> ByPriority, IReadOnlyList<TicketDto> Recent);

public sealed class AppException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public interface ITicketStore
{
    Task<Ticket?> Find(Guid id, CancellationToken ct);
    Task<bool> UserExists(Guid id, CancellationToken ct);
    Task Add(Ticket ticket, CancellationToken ct);
    Task Save(CancellationToken ct);
    Task Delete(Ticket ticket, CancellationToken ct);
    Task<PageDto<TicketDto>> List(TicketQuery query, Guid userId, CancellationToken ct);
    Task<DashboardDto> Dashboard(CancellationToken ct);
}

public static class Mapping
{
    public static TicketDto ToDto(this Ticket t) => new(t.Id, t.Title, t.Description, t.Category, t.Priority,
        t.Status, t.CreatedAt, t.UpdatedAt, new(t.Creator.Id, t.Creator.Name),
        t.Assignee is null ? null : new(t.Assignee.Id, t.Assignee.Name), t.ResolutionNote);
    public static UserDto ToDto(this User u) => new(u.Id, u.Name, u.Email, u.CreatedAt);
}
