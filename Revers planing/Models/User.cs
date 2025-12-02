namespace Revers_planing.Models;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = String.Empty;
    public string Email { get; set; } = String.Empty;
    public string PasswordHash { get; set; } = String.Empty;

    void login(string email, string password)
    {
    }

    string getFullName() => Name; // ?Зачем нам этот метод, если ы и так можем получить имя через гет
}