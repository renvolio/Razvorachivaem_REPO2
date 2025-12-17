using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Revers_planing.Data;
using Revers_planing.Extensions;
using Revers_planing.Services;

namespace Revers_planing;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

        builder.Services.Configure<JwtOptions>(
            builder.Configuration.GetSection("JwtOptions"));

        builder.Services.AddJwtAuthentication(builder.Configuration);

        builder.Services.AddScoped<IJWTProvider, JWTProvider>();
        builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<ISubjectService, SubjectService>();
        builder.Services.AddScoped<IProjectService, ProjectService>();
        builder.Services.AddScoped<ITaskService, TaskService>();

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        builder.Services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
            
            options.AddPolicy("Teacher", policy => policy.RequireRole("Teacher"));
            options.AddPolicy("Student", policy => policy.RequireRole("Student"));
        });
        builder.Services.AddCors(options => {
            options.AddPolicy("AllowFrontend", policy => {
                policy.SetIsOriginAllowed(origin => true)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors("AllowFrontend");
        app.UseAuthentication();
        app.UseAuthorization();
       
        app.MapControllers();
        app.Run();
    }
}