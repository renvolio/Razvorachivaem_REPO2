using System.ComponentModel.DataAnnotations;

namespace Revers_planing.DTOs.Auth;

public class RegisterDTO
{
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
    [Required]
    public string Email { get; set; } = string.Empty;
    public bool IsTeacher { get; set; }
    public string? Position { get; set; }
}

