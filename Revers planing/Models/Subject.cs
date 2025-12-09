namespace Revers_planing.Models;

public class Subject
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Discription { get; set; } = string.Empty;
    public List<int> AllowedGroups { get; set; } = [];

    public List<Student> Students { get; set; } = new();
    
    public List<Team> Teams { get; set; } = new();
    
    public List<Project> Projects { get; set; } = new List<Project>();
    
    public List<Teacher> Teachers { get; set; } = new List<Teacher>();
}