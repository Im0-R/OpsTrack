using Microsoft.EntityFrameworkCore;
using OpsTrack.Application;
using OpsTrack.Domain;

namespace OpsTrack.Infrastructure;

public sealed class TicketStore(OpsDbContext db) : ITicketStore
{
    private IQueryable<Ticket> Expanded => db.Tickets.Include(x => x.Creator).Include(x => x.Assignee);
    public Task<Ticket?> Find(Guid id, CancellationToken ct) => Expanded.FirstOrDefaultAsync(x => x.Id == id, ct);
    public Task<bool> UserExists(Guid id, CancellationToken ct) => db.Users.AnyAsync(x => x.Id == id, ct);
    public async Task Add(Ticket ticket, CancellationToken ct) { db.Tickets.Add(ticket); await Save(ct); }
    public async Task Save(CancellationToken ct)
    {
        await db.SaveChangesAsync(ct);
        // Re-query after writes so DTOs reflect the current assignee, including removal.
        db.ChangeTracker.Clear();
    }
    public async Task Delete(Ticket ticket, CancellationToken ct) { db.Tickets.Remove(ticket); await db.SaveChangesAsync(ct); }

    public async Task<PageDto<TicketDto>> List(TicketQuery q, Guid userId, CancellationToken ct)
    {
        var query = Expanded.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var search = q.Search.Trim().ToLowerInvariant();
            query = query.Where(t => t.Title.ToLower().Contains(search));
        }
        if (q.Status is not null) query = query.Where(t => t.Status == q.Status);
        if (q.Priority is not null) query = query.Where(t => t.Priority == q.Priority);
        if (q.Category is not null) query = query.Where(t => t.Category == q.Category);
        if (q.Mine) query = query.Where(t => t.CreatorId == userId);
        if (q.Scope == "urgent") query = query.Where(t => (t.Priority == TicketPriority.High || t.Priority == TicketPriority.Critical)
            && (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress));
        if (q.Scope == "completed") query = query.Where(t => t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed);
        var total = await query.CountAsync(ct);
        query = q.Sort switch
        {
            "oldest" => query.OrderBy(t => t.CreatedAt).ThenBy(t => t.Id),
            "priority" => query.OrderByDescending(t => t.Priority).ThenByDescending(t => t.CreatedAt).ThenBy(t => t.Id),
            _ => query.OrderByDescending(t => t.CreatedAt).ThenBy(t => t.Id)
        };
        var rows = await query.Skip((q.Page - 1) * q.PageSize).Take(q.PageSize).ToListAsync(ct);
        return new(rows.Select(t => t.ToDto()).ToList(), total, q.Page, q.PageSize);
    }

    public async Task<DashboardDto> Dashboard(CancellationToken ct)
    {
        var statuses = await db.Tickets.GroupBy(t => t.Status).Select(g => new { Value = g.Key, Count = g.Count() }).ToListAsync(ct);
        var priorities = await db.Tickets.GroupBy(t => t.Priority).Select(g => new { Value = g.Key, Count = g.Count() }).ToListAsync(ct);
        var urgent = await db.Tickets.CountAsync(t => (t.Priority == TicketPriority.High || t.Priority == TicketPriority.Critical)
            && (t.Status == TicketStatus.Open || t.Status == TicketStatus.InProgress), ct);
        var recent = await Expanded.AsNoTracking().OrderByDescending(t => t.CreatedAt).ThenBy(t => t.Id).Take(5).ToListAsync(ct);
        return new(statuses.Sum(x => x.Count), statuses.Where(x => x.Value == TicketStatus.Open).Sum(x => x.Count), urgent,
            statuses.Where(x => x.Value == TicketStatus.Resolved || x.Value == TicketStatus.Closed).Sum(x => x.Count),
            Enum.GetValues<TicketStatus>().Select(v => new CountDto(v.ToString(), statuses.FirstOrDefault(x => x.Value == v)?.Count ?? 0)).ToList(),
            Enum.GetValues<TicketPriority>().Select(v => new CountDto(v.ToString(), priorities.FirstOrDefault(x => x.Value == v)?.Count ?? 0)).ToList(),
            recent.Select(t => t.ToDto()).ToList());
    }
}
