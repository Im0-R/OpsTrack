using Microsoft.EntityFrameworkCore;
using OpsTrack.Domain;

namespace OpsTrack.Infrastructure;

public class OpsDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Ticket> Tickets => Set<Ticket>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.Property(x => x.Email).HasMaxLength(254).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        });
        model.Entity<Ticket>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(160).IsRequired();
            e.Property(x => x.Description).HasMaxLength(5000).IsRequired();
            e.Property(x => x.ResolutionNote).HasMaxLength(2000);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Assignee).WithMany().HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.Status, x.Priority });
            e.HasIndex(x => x.CreatedAt);
        });
    }
}

public sealed class SqlServerOpsDbContext(DbContextOptions<SqlServerOpsDbContext> options) : OpsDbContext(options);
public sealed class SqliteOpsDbContext(DbContextOptions<SqliteOpsDbContext> options) : OpsDbContext(options);
