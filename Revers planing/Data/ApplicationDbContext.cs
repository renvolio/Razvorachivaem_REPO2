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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasDiscriminator<string>("UserType")
            .HasValue<Student>("Student")
            .HasValue<Teacher>("Teacher");

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Project>()
            .HasMany(p => p.Teams)
            .WithMany(t => t.Projects);

        modelBuilder.Entity<Task_>()
            .HasOne(t => t.Team)
            .WithMany(team => team.Tasks)
            .HasForeignKey(t => t.TeamId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Team>()
            .HasOne(t => t.Subject)
            .WithMany(s => s.Teams)
            .HasForeignKey(t => t.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.Subject)
            .WithMany(s => s.Projects)
            .HasForeignKey(p => p.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Task_>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Task_>()
            .HasOne(t => t.ParentTask)
            .WithMany(t => t.Children)
            .HasForeignKey(t => t.ParentTaskId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Teacher>()
            .HasMany(t => t.Subjects)
            .WithMany(s => s.Teachers);

        modelBuilder.Entity<Student>()
            .HasMany(st => st.Subjects)
            .WithMany(s => s.Students);

        modelBuilder.Entity<Task_>()
            .HasMany(t => t.Students)
            .WithMany(s => s.Tasks);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.Teacher)
            .WithMany(t => t.Projects)
            .HasForeignKey(p => p.TeacherId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}