using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Revers_planing.Models;

namespace Revers_planing.Services;

public class JWTProvider : IJWTProvider
{
    private readonly JwtOptions _options;

    public JWTProvider(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateToken(User user, string role)
    {
        var claims = new List<Claim>
        {
            new Claim("userId", user.Id.ToString()),
            new Claim("email", user.Email),
            new Claim(ClaimTypes.Role, role)
        };

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            signingCredentials: signingCredentials,
            expires: DateTime.UtcNow.AddHours(_options.ExpiresHours));

        var tokenValue = new JwtSecurityTokenHandler().WriteToken(token);
        return tokenValue;
    }
}
