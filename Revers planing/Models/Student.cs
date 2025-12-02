namespace Revers_planing.Models;

public class Student : User
{
    public Guid Id { get; set; }
 
    public int TeamId { get; set; }
    public Team? Team { get; set; }
    
    public List<Subject> Subjects { get; set; } = new();
    public List<Task> Tasks { get; set; } = new();
}