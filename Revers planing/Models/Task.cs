namespace Revers_planing.Models;

public class Task_
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public TimeSpan DeadlineAssessment { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime StartDate { get; set; }
    
    public List<Student> Students { get; set; } = new();

    public Guid TeamId { get; set; }
    public Team Team { get; set; }


    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;


    public Guid? ParentTaskId { get; set; }
    public Task? ParentTask { get; set; }
    public ICollection<Task> Children { get; set; } = new List<Task>();

    public TaskStatus Status { get; set; } = TaskStatus.Planned;
  
}