using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OpsTrack.Domain;
using OpsTrack.Infrastructure;

namespace OpsTrack.Api;

public static class DemoSeeder
{
    public static async Task Seed(OpsDbContext db, IPasswordHasher<User> hasher, IConfiguration config)
    {
        var password = config["Demo:Password"];
        if (string.IsNullOrWhiteSpace(password) || await db.Users.AnyAsync()) return;
        if (password.Length < 12) throw new InvalidOperationException("Demo__Password must contain at least 12 characters.");
        var owner = new User { Name = "Alex Morgan", Email = "alex@example.test" };
        owner.PasswordHash = hasher.HashPassword(owner, password);
        var colleague = new User { Name = "Sam Rivera", Email = "sam@example.test" };
        colleague.PasswordHash = hasher.HashPassword(colleague, password);
        db.Users.AddRange(owner, colleague);
        string[] titles = ["Payment reconciliation delayed", "VPN access for new starters", "Scheduled database maintenance", "Reporting dashboard unavailable", "Provision finance shared workspace", "Nightly backup verification", "Invoice export format mismatch", "Replace meeting room workstation"];
        for (var i = 0; i < titles.Length; i++)
        {
            var status = (TicketStatus)(i % 4);
            db.Tickets.Add(new Ticket
            {
                Title = titles[i],
                Description = "The operations team reported this item during the daily review. Please investigate, coordinate with the assigned team member, and document the outcome.",
                Creator = owner,
                Assignee = i % 2 == 0 ? colleague : owner,
                Category = (TicketCategory)(i % 3),
                Priority = (TicketPriority)((i + 2) % 4),
                Status = status,
                CreatedAt = DateTime.UtcNow.AddDays(-i - 1),
                UpdatedAt = DateTime.UtcNow.AddHours(-i),
                ResolutionNote = status is TicketStatus.Resolved or TicketStatus.Closed ? "Changes verified with the requesting team. Service is operating normally." : null
            });
        }
        await db.SaveChangesAsync();
    }
}
