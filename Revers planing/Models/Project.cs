namespace Revers_planing.Models;

public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; }


    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; }

    public List<Team> Teams { get; set; } = new List<Team>();
 
    public List<Task_> Tasks { get; set; } = new List<Task_>();

    public Guid? TeacherId { get; set; }
    public Teacher? Teacher { get; set; }
}