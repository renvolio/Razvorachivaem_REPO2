using Revers_planing.Models;

namespace Revers_planing.Services;

public interface IAuthService
{
    Task<User> Register(string userName, string email, string password, bool isTeacher, string? position = null);
    Task<string> Login(string email, string password);
}
