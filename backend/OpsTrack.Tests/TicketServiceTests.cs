using OpsTrack.Application;
using OpsTrack.Domain;

namespace OpsTrack.Tests;

public sealed class TicketServiceTests
{
    [Fact]
    public async Task CreateNormalizesContentAndPreservesCreator()
    {
        var store = new FakeStore(); var service = new TicketService(store);
        var result = await service.Create(new() { Title = "  VPN access request  ", Description = "  Access needed for the finance team.  " }, store.Owner.Id, default);
        Assert.Equal("VPN access request", result.Title);
        Assert.Equal("Access needed for the finance team.", result.Description);
        Assert.Equal(store.Owner.Id, result.Creator.Id);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task NonOwnerCannotReachPersistence(bool deleting)
    {
        var store = new FakeStore(); var service = new TicketService(store);
        store.Ticket = new() { CreatorId = store.Owner.Id, Creator = store.Owner };
        var error = await Assert.ThrowsAsync<AppException>(() => deleting
            ? service.Delete(store.Ticket.Id, Guid.NewGuid(), default)
            : service.Update(store.Ticket.Id, new(), Guid.NewGuid(), default));
        Assert.Equal(403, error.Status); Assert.False(store.Written);
    }

    [Fact]
    public async Task InvalidDataNeverReachesPersistence()
    {
        var store = new FakeStore();
        var error = await Assert.ThrowsAsync<AppException>(() => new TicketService(store).Create(new() { Title = "  ", Description = "bad" }, store.Owner.Id, default));
        Assert.Equal(400, error.Status); Assert.False(store.Written);
    }

    private sealed class FakeStore : ITicketStore
    {
        public User Owner { get; } = new() { Name = "Operator" };
        public Ticket? Ticket { get; set; }
        public bool Written { get; private set; }
        public Task<Ticket?> Find(Guid id, CancellationToken ct) => Task.FromResult(Ticket);
        public Task<bool> UserExists(Guid id, CancellationToken ct) => Task.FromResult(id == Owner.Id);
        public Task Add(Ticket ticket, CancellationToken ct) { ticket.Creator = Owner; Ticket = ticket; Written = true; return Task.CompletedTask; }
        public Task Save(CancellationToken ct) { Written = true; return Task.CompletedTask; }
        public Task Delete(Ticket ticket, CancellationToken ct) { Written = true; return Task.CompletedTask; }
        public Task<PageDto<TicketDto>> List(TicketQuery query, Guid userId, CancellationToken ct) => throw new NotSupportedException();
        public Task<DashboardDto> Dashboard(CancellationToken ct) => throw new NotSupportedException();
    }
}
