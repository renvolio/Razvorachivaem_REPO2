namespace Revers_planing.Models;

public class Team 
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    
    public List<Student> Students { get; set; } = new();
   
    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; }
    
    public List<Project> Projects { get; set; } = new List<Project>();
    
    public List<Task_> Tasks { get; set; } = new List<Task_>();


}