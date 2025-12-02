using Microsoft.EntityFrameworkCore;
using Revers_planing.Models;

namespace Revers_planing.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Teacher> Teachers { get; set; } = null!;
    public DbSet<Student> Students { get; set; } = null!;
    public DbSet<Subject> Subjects { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Task_> Tasks { get; set; } = null!;
    public DbSet<Team> Teams { get; set; } = null!;
}