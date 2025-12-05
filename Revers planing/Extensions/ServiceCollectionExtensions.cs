using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Revers_planing.Services;

namespace Revers_planing.Extensions;

public static class ServiceCollectionExtensions
{

    public static void addApiAuthentication
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetSection("JwtOptions").Get<JwtOptions>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.TokenValidationParameters = new()
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtOptions!.Issuer,
                ValidAudience = jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey))
            };
            options.Events = new JwtBearerEvents
            {
               OnMessageReceived = context =>
               {
                context.Token = context.Request.Cookies["cookie"];  
                return Task.CompletedTask;  // этот токен будет использоваться для автор
               }
            };
        });
        services.AddAuthentication(); 

        return services;
    }
}

