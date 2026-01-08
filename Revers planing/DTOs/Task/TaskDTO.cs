using Revers_planing.Models;

namespace Revers_planing.DTOs.Task;

public class TaskDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan DeadlineAssessment { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime StartDate { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public Guid TeamId { get; set; }
    public int TeamNumber { get; set; }
    public string? TeamName { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ParentTaskId { get; set; }
    public Models.TaskStatus Status { get; set; }
    public Guid? ResponsibleStudentId { get; set; }
    public string? ResponsibleStudentName { get; set; }
    public string? ResponsibleStudentEmail { get; set; }
}


