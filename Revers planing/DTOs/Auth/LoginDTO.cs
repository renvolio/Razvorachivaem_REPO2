using System.ComponentModel.DataAnnotations;

namespace Revers_planing.DTOs.Auth;

public class LoginDTO
{
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
}

