using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpsTrack.Application;
using OpsTrack.Domain;
using OpsTrack.Infrastructure;

namespace OpsTrack.Api;

public sealed record JwtSettings(string Issuer, string Audience, byte[] Key);

public sealed class AuthService(OpsDbContext db, IPasswordHasher<User> hasher, JwtSettings settings)
{
    public async Task<AuthResponse> Register(RegisterRequest input, CancellationToken ct)
    {
        var name = input.Name.Trim();
        if (name.Length < 2) throw new AppException(400, "Name must contain at least 2 characters.");
        var email = input.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email, ct)) throw new AppException(409, "This email is already registered.");
        var user = new User { Name = name, Email = email };
        user.PasswordHash = hasher.HashPassword(user, input.Password);
        db.Users.Add(user);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            db.Entry(user).State = EntityState.Detached;
            if (await db.Users.AnyAsync(x => x.Email == email, ct)) throw new AppException(409, "This email is already registered.");
            throw;
        }
        return Issue(user);
    }

    public async Task<AuthResponse> Login(LoginRequest input, CancellationToken ct)
    {
        var email = input.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, ct);
        var result = hasher.VerifyHashedPassword(user ?? new User(), user?.PasswordHash ?? DummyHash, input.Password);
        if (user is null || result == PasswordVerificationResult.Failed) throw new AppException(401, "Email or password is incorrect.");
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = hasher.HashPassword(user, input.Password);
            await db.SaveChangesAsync(ct);
        }
        return Issue(user);
    }

    private static readonly string DummyHash = new PasswordHasher<User>().HashPassword(new(), Guid.NewGuid().ToString());
    private AuthResponse Issue(User user)
    {
        var expires = DateTime.UtcNow.AddHours(1);
        var token = new JwtSecurityToken(settings.Issuer, settings.Audience,
            [new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())],
            expires: expires, signingCredentials: new(new SymmetricSecurityKey(settings.Key), SecurityAlgorithms.HmacSha256));
        return new(new JwtSecurityTokenHandler().WriteToken(token), expires, user.ToDto());
    }
}
