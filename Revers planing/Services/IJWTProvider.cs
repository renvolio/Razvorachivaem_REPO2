using Revers_planing.Models;

namespace Revers_planing.Services;

public interface IJWTProvider
{
    string GenerateToken(User user,string role);
}

