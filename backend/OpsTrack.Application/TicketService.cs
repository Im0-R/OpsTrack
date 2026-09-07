using System.ComponentModel.DataAnnotations;
using OpsTrack.Domain;

namespace OpsTrack.Application;

public sealed class TicketService(ITicketStore store)
{
    public async Task<TicketDto> Get(Guid id, CancellationToken ct) => (await Require(id, ct)).ToDto();
    public Task<PageDto<TicketDto>> List(TicketQuery query, Guid userId, CancellationToken ct) => store.List(query, userId, ct);
    public Task<DashboardDto> Dashboard(CancellationToken ct) => store.Dashboard(ct);

    public async Task<TicketDto> Create(TicketInput input, Guid userId, CancellationToken ct)
    {
        await Validate(input, ct);
        var ticket = new Ticket { CreatorId = userId };
        Apply(ticket, input);
        await store.Add(ticket, ct);
        return (await Require(ticket.Id, ct)).ToDto();
    }

    public async Task<TicketDto> Update(Guid id, TicketInput input, Guid userId, CancellationToken ct)
    {
        var ticket = await Require(id, ct);
        CheckOwner(ticket, userId);
        await Validate(input, ct);
        Apply(ticket, input);
        ticket.UpdatedAt = DateTime.UtcNow;
        await store.Save(ct);
        return (await Require(id, ct)).ToDto();
    }

    public async Task Delete(Guid id, Guid userId, CancellationToken ct)
    {
        var ticket = await Require(id, ct);
        CheckOwner(ticket, userId);
        await store.Delete(ticket, ct);
    }

    private async Task<Ticket> Require(Guid id, CancellationToken ct) =>
        await store.Find(id, ct) ?? throw new AppException(404, "Ticket not found.");

    private static void CheckOwner(Ticket ticket, Guid userId)
    {
        if (ticket.CreatorId != userId) throw new AppException(403, "Only the ticket creator can change or delete this ticket.");
    }

    private async Task Validate(TicketInput input, CancellationToken ct)
    {
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(input, new(input), errors, true))
            throw new AppException(400, string.Join(" ", errors.Select(e => e.ErrorMessage)));
        if (input.AssigneeId is Guid id && !await store.UserExists(id, ct))
            throw new AppException(400, "The selected assignee does not exist.");
    }

    private static void Apply(Ticket ticket, TicketInput input)
    {
        ticket.Title = input.Title.Trim();
        ticket.Description = input.Description.Trim();
        ticket.Category = input.Category;
        ticket.Priority = input.Priority;
        ticket.Status = input.Status;
        ticket.AssigneeId = input.AssigneeId;
        ticket.ResolutionNote = string.IsNullOrWhiteSpace(input.ResolutionNote) ? null : input.ResolutionNote.Trim();
    }
}
