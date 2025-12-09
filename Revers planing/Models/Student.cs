namespace Revers_planing.Models;

public class Student : User
{
    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }
    
    public List<Subject> Subjects { get; set; } = new();
    public List<Task_> Tasks { get; set; } = new();
    public int GroupNumber { get; set; } = 0;
}