namespace Revers_planing.Services;

public class JwtOptions
{
    public string SecretKey { get; set; } = string.Empty; 
    public int ExpiresHours { get; set; } = 12;
}

