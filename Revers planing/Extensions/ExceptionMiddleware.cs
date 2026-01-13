namespace Revers_planing.Extensions
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext ctx)
        {
            try
            {
                await _next(ctx);
            }
            catch (InvalidOperationException e)
            {
                _logger.LogWarning(e, "Bad Request handled.");
                ctx.Response.StatusCode = 400;
                ctx.Response.ContentType = "text/plain; charset=utf-8";
                await ctx.Response.WriteAsync(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                _logger.LogWarning(e, "Unauthorized access attempt.");
                ctx.Response.StatusCode = 403;
                ctx.Response.ContentType = "text/plain; charset=utf-8";
                await ctx.Response.WriteAsync(e.Message);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Необработанная ошибка на сервере: {Message}", e.Message);
                ctx.Response.StatusCode = 500;
                ctx.Response.ContentType = "text/plain; charset=utf-8";
                await ctx.Response.WriteAsync($"Внутренняя ошибка сервера: \n{e.Message}\n)\n{e.StackTrace}");
            }
        }
    }
}
