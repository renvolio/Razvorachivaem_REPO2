using Revers_planing.Models;

namespace Revers_planing.Models;

public class Teacher : User
{
    public string Position { get; set; } = string.Empty;
    
    public List<Subject> Subjects { get; set; } = new List<Subject>();
    
    public List<Project> Projects { get; set; } = new List<Project>();

    
}