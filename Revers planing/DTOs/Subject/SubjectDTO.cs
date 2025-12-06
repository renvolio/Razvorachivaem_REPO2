namespace Revers_planing.DTOs.Subject;

public class SubjectDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Discription { get; set; } = string.Empty;
}


