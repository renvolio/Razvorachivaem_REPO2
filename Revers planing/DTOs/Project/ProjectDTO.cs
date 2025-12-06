namespace Revers_planing.DTOs.Project;

public class ProjectDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid SubjectId { get; set; }
    public Guid? TeacherId { get; set; }
    
}


