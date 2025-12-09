using Revers_planing.Models;

namespace Revers_planing.DTOs.Task;

public class UpdateTaskDTO
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public TimeSpan? DeadlineAssessment { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? StartDate { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? ParentTaskId { get; set; }
    public Models.TaskStatus? Status { get; set; }
    public Guid? ResponsibleStudentId { get; set; }
}


