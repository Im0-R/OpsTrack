using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using OpsTrack.Application;

namespace OpsTrack.Api;

public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var status = exception is AppException error ? error.Status : 500;
        if (status == 500) logger.LogError(exception, "Unhandled API failure");
        context.Response.StatusCode = status;
        return await problems.TryWriteAsync(new()
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails { Status = status, Title = status == 500 ? "An unexpected error occurred. Please try again." : exception.Message }
        });
    }
}
